import { z } from "zod";
import { cupPlanSchema, type CupPlan } from "./cup-plan-config";

// Cup day: the heat draw, the judges' scores and the leaderboard. Pure logic
// shared by the server (src/lib/server/comp.ts), the organiser board, the
// judge sheet and the public live page. No database, no DOM.

export const RASHIES = ["red", "yellow", "blue", "green"] as const;
export type Rashie = (typeof RASHIES)[number];
export const rashieLabel: Record<Rashie, string> = { red: "Red", yellow: "Yellow", blue: "Blue", green: "Green" };
export const rashieDot: Record<Rashie, string> = { red: "🔴", yellow: "🟡", blue: "🔵", green: "🟢" };

export type HeatStage = "round" | "final";
export type HeatStatus = "scheduled" | "running" | "done";
export const heatStatuses: HeatStatus[] = ["scheduled", "running", "done"];

export type CupConfig = { edition: string; rounds: number; heatSize: number; finalSize: number; live: boolean; version: number; plan?: CupPlan | null; finalReview?: { order: string[]; reason: string } | null };
export type Entrant = { id: string; name: string; age: number | null; member: boolean; photoVersion: string | null };
export type Slot = { kidId: string; colour: Rashie };
export type Heat = { id: string; stage: HeatStage; round: number; number: number; status: HeatStatus; startedAt: string | null; finishedAt: string | null; slots: Slot[]; judges: string[]; durationMinutes: number; endsAt: string | null };
export type Wave = { id: string; heatId: string; kidId: string; judge: string; wave: number; score: number };
export type Judge = { email: string; name: string };
export type TickerItem = { id: string; kind: "note" | "heat" | "result"; message: string; at: string };

// Each judge rates the same numbered run from one to five stars.
export const WAVE_SCORES = [1, 2, 3, 4, 5];
export const MAX_WAVES = 15;

export const heatLabel = (heat: Pick<Heat, "stage" | "round" | "number">) =>
  heat.stage === "final" ? (heat.number === 1 ? "The Final" : `Placement final ${heat.number}`) : `Round ${heat.round} · Heat ${heat.number}`;
export const heatShort = (heat: Pick<Heat, "stage" | "round" | "number">) =>
  heat.stage === "final" ? (heat.number === 1 ? "Final" : `Final ${heat.number}`) : `R${heat.round}·H${heat.number}`;
// Heats in the order they run: round by round, the final last.
export const byRunningOrder = (a: Heat, b: Heat) =>
  Number(a.stage === "final") - Number(b.stage === "final") || a.round - b.round || (a.stage === "final" ? b.number - a.number : a.number - b.number);
export const heatRound = (heat: Pick<Heat, "stage" | "round">) => (heat.stage === "final" ? 0 : heat.round);

// ---------- The draw ----------

// N kids over as few heats as fit, sizes as even as they come: 14 kids in
// heats of 4 is 4,4,3,3 — never 4,4,4,2.
export function heatSizes(count: number, heatSize: number): number[] {
  if (count <= 0) return [];
  const heats = Math.ceil(count / heatSize);
  const base = Math.floor(count / heats);
  const extra = count % heats;
  return Array.from({ length: heats }, (_, i) => base + (i < extra ? 1 : 0));
}

const byAge = (a: Entrant, b: Entrant) => {
  if (a.age === null || b.age === null) return Number(a.age === null) - Number(b.age === null);
  return a.age - b.age || a.name.localeCompare(b.name);
};

function shuffle<T>(items: T[], random: () => number) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Rashies rotate: a kid gets a colour they have not worn yet when the heat
// still has one free, so nobody is "the red one" all afternoon.
function colourUp(kids: string[], worn: Map<string, Set<Rashie>>): Slot[] {
  const free = new Set<Rashie>(RASHIES);
  return kids.map((kidId) => {
    const fresh = [...free].find((colour) => !worn.get(kidId)?.has(colour));
    const colour = fresh ?? [...free][0];
    free.delete(colour);
    return { kidId, colour };
  });
}

/**
 * Draws one round. Round 1 lines the kids up by age so the youngest surf
 * together; every later round is shuffled, keeping kids who already shared a
 * heat apart where the numbers allow. Every entrant surfs exactly once per
 * round, so everybody gets the same number of runs.
 */
export function drawRound(entrants: Entrant[], round: number, heatSize: number, previous: Heat[], random: () => number = Math.random): Slot[][] {
  const sizes = heatSizes(entrants.length, heatSize);
  const heats: string[][] = sizes.map(() => []);
  const worn = new Map<string, Set<Rashie>>();
  const mates = new Map<string, Map<string, number>>();
  for (const heat of previous) {
    for (const slot of heat.slots) {
      worn.set(slot.kidId, (worn.get(slot.kidId) ?? new Set()).add(slot.colour));
      const own = mates.get(slot.kidId) ?? new Map<string, number>();
      for (const other of heat.slots) if (other.kidId !== slot.kidId) own.set(other.kidId, (own.get(other.kidId) ?? 0) + 1);
      mates.set(slot.kidId, own);
    }
  }
  if (round === 1) {
    const order = [...entrants].sort(byAge);
    let cursor = 0;
    for (const [index, size] of sizes.entries()) heats[index] = order.slice(cursor, (cursor += size)).map((kid) => kid.id);
  } else {
    for (const kid of shuffle(entrants, random)) {
      const open = heats.map((heat, index) => ({ index, heat })).filter(({ heat, index }) => heat.length < sizes[index]);
      const overlap = ({ heat }: { heat: string[] }) => heat.reduce((sum, mate) => sum + (mates.get(kid.id)?.get(mate) ?? 0), 0);
      open.sort((a, b) => overlap(a) - overlap(b) || a.heat.length - b.heat.length);
      open[0].heat.push(kid.id);
    }
  }
  return heats.map((kids) => colourUp(kids, worn));
}

/** The final: the top of the leaderboard in one heat, colours by rank. */
export function drawFinal(standings: Standing[], finalSize: number): Slot[] {
  const worn = new Map<string, Set<Rashie>>();
  return colourUp(standings.filter((row) => row.heats > 0).slice(0, finalSize).map((row) => row.kidId), worn);
}

// ---------- Scoring ----------

export const best2 = (scores: number[]) => {
  const sorted = [...scores].sort((a, b) => b - a);
  return sorted.length ? (sorted[0] + (sorted[1] ?? 0)) / Math.min(sorted.length, 2) : 0;
};
const round2 = (value: number) => Math.round(value * 100) / 100;

export type HeatResult = { kidId: string; score: number | null; byJudge: Record<string, number>; waves: number };

/** Average ratings of the same run before choosing the best two runs.
 * Only scored runs count: one run stands alone until a second run is scored.
 * Saved ratings remain part of results if a judge is later unassigned.
 */
export function runScores(waves: Wave[]): number[] {
  const runs = new Map<string, number[]>();
  for (const wave of waves) {
    const key = `${wave.heatId}:${wave.wave}`;
    runs.set(key, [...(runs.get(key) ?? []), wave.score]);
  }
  return [...runs.values()].map((ratings) => ratings.reduce((sum, score) => sum + score, 0) / ratings.length);
}
export function heatResults(heat: Heat, waves: Wave[]): Map<string, HeatResult> {
  const results = new Map<string, HeatResult>();
  for (const slot of heat.slots) {
    const own = waves.filter((wave) => wave.heatId === heat.id && wave.kidId === slot.kidId);
    const scores = runScores(own);
    const byJudge = Object.fromEntries([...new Set(own.map((wave) => wave.judge))].map((judge) => [judge, best2(own.filter((wave) => wave.judge === judge).map((wave) => wave.score))]));
    results.set(slot.kidId, { kidId: slot.kidId, score: scores.length ? round2(best2(scores)) : null, byJudge, waves: scores.length });
  }
  return results;
}

export type Standing = { kidId: string; name: string; age: number | null; rounds: (number | null)[]; total: number; best: number; heats: number; final: number | null; finalPlace?: number | null; finalGroup?: number; rank: number };

/** Best two runs across qualifying heats; the final is scored separately. */
export function standings(config: Pick<CupConfig, "rounds" | "plan">, entrants: Entrant[], heats: Heat[], waves: Wave[]): Standing[] {
  const rows = new Map<string, Standing>(
    entrants.map((kid) => [kid.id, { kidId: kid.id, name: kid.name, age: kid.age, rounds: Array.from({ length: config.rounds }, () => null), total: 0, best: 0, heats: 0, final: null, rank: 0 }]),
  );
  for (const heat of heats) {
    const results = heatResults(heat, waves);
    for (const slot of heat.slots) {
      const row = rows.get(slot.kidId);
      const result = results.get(slot.kidId);
      if (!row || !result) continue;
      if (heat.stage === "final") { row.final = result.score; continue; }
      if (config.plan && heat.status !== "done") continue;
      row.heats++;
      if (heat.round >= 1 && heat.round <= config.rounds && (result.score !== null || config.plan)) row.rounds[heat.round - 1] = Math.max(row.rounds[heat.round - 1] ?? 0, result.score ?? 0);
    }
  }
  const ranked = [...rows.values()].map((row) => {
    const qualifying = new Set(heats.filter((heat) => heat.stage === "round" && (!config.plan || heat.status === "done") && heat.slots.some((slot) => slot.kidId === row.kidId)).map((heat) => heat.id));
    const scores = runScores(waves.filter((wave) => wave.kidId === row.kidId && qualifying.has(wave.heatId)));
    const completed = row.rounds.filter((score): score is number => score !== null);
    return { ...row, total: config.plan ? round2(completed.reduce((sum, score) => sum + score, 0) / (completed.length || 1)) : round2(best2(scores)), best: Math.max(0, ...scores) };
  });
  ranked.sort((a, b) => b.total - a.total || b.best - a.best || a.name.localeCompare(b.name));
  ranked.forEach((row, index) => { row.rank = index > 0 && ranked[index - 1].total === row.total && ranked[index - 1].best === row.best ? ranked[index - 1].rank : index + 1; });
  if (config.plan) for (const heat of heats.filter(h => h.stage === "final")) {
    const group = ranked.filter(row => heat.slots.some(slot => slot.kidId === row.kidId));
    group.sort((a, b) => (b.final ?? 0) - (a.final ?? 0) || b.total - a.total || b.best - a.best);
    for (const [i, row] of group.entries()) {
      row.finalGroup = heat.number;
      row.finalPlace = heat.status !== "done" ? null : i > 0 && (group[i - 1].final ?? 0) === (row.final ?? 0) && group[i - 1].total === row.total && group[i - 1].best === row.best ? group[i - 1].finalPlace : (heat.number - 1) * 4 + i + 1;
    }
  }
  return ranked;
}

export const formatScore = (score: number | null) => (score === null ? "—" : Number.isInteger(score) ? String(score) : score.toFixed(Number.isInteger(score * 10) ? 1 : 2));

// ---------- API bodies ----------

const uuid = z.uuid();
export const configPatchSchema = z.object({
  rounds: z.int().min(1).max(6).optional(),
  heatSize: z.int().min(2).max(4).optional(),
  finalSize: z.int().min(2).max(4).optional(),
  live: z.boolean().optional(),
  plan: cupPlanSchema.optional(),
  version: z.int().min(1),
}).strict();
export const drawSchema = z.object({ round: z.int().min(1).max(6) }).strict();
export const roundParam = z.union([z.literal("final"), z.coerce.number().int().min(1).max(6)]);
export const slotMoveSchema = z.object({
  kidId: uuid,
  stage: z.enum(["round", "final"]),
  round: z.int().min(0).max(6),
  heatId: uuid.nullable(),
  colour: z.enum(RASHIES).optional(),
  swapKidId: uuid.optional(),
}).strict();
export const heatPatchSchema = z.union([z.object({ status: z.enum(heatStatuses) }).strict(), z.object({ durationMinutes: z.int().min(1).max(60) }).strict()]);
export type HeatVolunteer = { heatId: string; email: string; status: "pending" | "approved" | "declined" };
export const volunteerReviewSchema = z.object({ email: z.string().trim().pipe(z.email()).transform((email) => email.toLowerCase()), decision: z.enum(["approved", "declined"]) }).strict();
export const heatJudgesSchema = z.object({ judges: z.array(z.string().trim().pipe(z.email().max(254)).transform((email) => email.toLowerCase())).max(30) }).strict();
export const judgeSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(80),
}).strict();
export const tickerSchema = z.object({ message: z.string().trim().min(1).max(200) }).strict();
export const waveCreateSchema = z.object({ heatId: uuid, kidId: uuid, wave: z.int().min(1).max(MAX_WAVES).optional(), score: z.int().min(1).max(5) }).strict();
export const wavePatchSchema = z.object({ score: z.int().min(1).max(5) }).strict();

/** All clients use the server's deadline. No score is accepted at or after zero. */
export function heatSecondsLeft(heat: Pick<Heat, "status" | "endsAt">, now: number): number {
  return heat.status === "running" && heat.endsAt ? Math.max(0, Math.ceil((Date.parse(heat.endsAt) - now) / 1000)) : 0;
}
export function heatClockLabel(seconds: number): string { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }

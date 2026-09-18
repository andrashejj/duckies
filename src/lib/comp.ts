import { z } from "zod";

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

export type CupConfig = { edition: string; rounds: number; heatSize: number; finalSize: number; live: boolean; version: number };
export type Entrant = { id: string; name: string; age: number | null; member: boolean; photoVersion: string | null };
export type Slot = { kidId: string; colour: Rashie };
export type Heat = { id: string; stage: HeatStage; round: number; number: number; status: HeatStatus; startedAt: string | null; finishedAt: string | null; slots: Slot[] };
export type Wave = { id: string; heatId: string; kidId: string; judge: string; wave: number; score: number };
export type Judge = { email: string; name: string };
export type TickerItem = { id: string; kind: "note" | "heat" | "result"; message: string; at: string };

// Judges score a wave from 0.5 to 10 in halves; a wipeout is simply not scored.
export const WAVE_SCORES = Array.from({ length: 20 }, (_, i) => (i + 1) / 2);
export const MAX_WAVES = 15;

export const heatLabel = (heat: Pick<Heat, "stage" | "round" | "number">) =>
  heat.stage === "final" ? "The Final" : `Round ${heat.round} · Heat ${heat.number}`;
export const heatShort = (heat: Pick<Heat, "stage" | "round" | "number">) =>
  heat.stage === "final" ? "Final" : `R${heat.round}·H${heat.number}`;
// Heats in the order they run: round by round, the final last.
export const byRunningOrder = (a: Heat, b: Heat) =>
  Number(a.stage === "final") - Number(b.stage === "final") || a.round - b.round || a.number - b.number;
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
  return (sorted[0] ?? 0) + (sorted[1] ?? 0);
};
const round2 = (value: number) => Math.round(value * 100) / 100;

export type HeatResult = { kidId: string; score: number | null; byJudge: Record<string, number>; waves: number };

/**
 * A kid's heat score: for every judge who scored the heat, the sum of that
 * judge's best two waves for the kid (nothing ridden counts 0), averaged over
 * those judges. Null until somebody has scored the heat.
 */
export function heatResults(heat: Heat, waves: Wave[]): Map<string, HeatResult> {
  const inHeat = waves.filter((wave) => wave.heatId === heat.id);
  const judges = [...new Set(inHeat.map((wave) => wave.judge))];
  const results = new Map<string, HeatResult>();
  for (const slot of heat.slots) {
    const own = inHeat.filter((wave) => wave.kidId === slot.kidId);
    const byJudge: Record<string, number> = {};
    for (const judge of judges) byJudge[judge] = best2(own.filter((wave) => wave.judge === judge).map((wave) => wave.score));
    const totals = Object.values(byJudge);
    results.set(slot.kidId, {
      kidId: slot.kidId,
      score: totals.length ? round2(totals.reduce((sum, total) => sum + total, 0) / totals.length) : null,
      byJudge,
      waves: own.length,
    });
  }
  return results;
}

export type Standing = { kidId: string; name: string; age: number | null; rounds: (number | null)[]; total: number; best: number; heats: number; final: number | null; rank: number };

/** The leaderboard: heat scores per round added up, ranked; the final kept apart. */
export function standings(config: Pick<CupConfig, "rounds">, entrants: Entrant[], heats: Heat[], waves: Wave[]): Standing[] {
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
      row.heats++;
      if (heat.round >= 1 && heat.round <= config.rounds && result.score !== null) row.rounds[heat.round - 1] = Math.max(row.rounds[heat.round - 1] ?? 0, result.score);
    }
  }
  const ranked = [...rows.values()].map((row) => {
    const scores = row.rounds.filter((score): score is number => score !== null);
    return { ...row, total: round2(scores.reduce((sum, score) => sum + score, 0)), best: Math.max(0, ...scores) };
  });
  ranked.sort((a, b) => b.total - a.total || b.best - a.best || a.name.localeCompare(b.name));
  ranked.forEach((row, index) => { row.rank = index > 0 && ranked[index - 1].total === row.total && ranked[index - 1].best === row.best ? ranked[index - 1].rank : index + 1; });
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
}).strict();
export const heatPatchSchema = z.object({ status: z.enum(heatStatuses) }).strict();
export const judgeSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(80),
}).strict();
export const tickerSchema = z.object({ message: z.string().trim().min(1).max(200) }).strict();
export const waveCreateSchema = z.object({ heatId: uuid, kidId: uuid, score: z.number().min(0.5).max(10).multipleOf(0.5) }).strict();
export const wavePatchSchema = z.object({ score: z.number().min(0.5).max(10).multipleOf(0.5) }).strict();

import { boundaryTies, cupTimetable, progressiveDraw, roundReadiness, type CupPlan } from "../cup-planner";
import type { APIRoute } from "astro";
import type pg from "pg";
import { CUP_LABEL, CUP_TERM, publicName } from "../registration/cup";
import { memberPaidSql, RegistrationError } from "../registration/records";
import { correctedBirthDateSql } from "../registration/birth-date-corrections";
import { ageAt } from "../registration/schema";
import { getSemester } from "../registration/semesters";
import {
  byRunningOrder, drawFinal, drawRound, formatScore, heatLabel, heatResults, MAX_WAVES, rashieDot, rashieLabel, RASHIES, standings,
  type HeatVolunteer, type CupConfig, type Entrant, type Heat, type HeatStatus, type Judge, type Rashie, type Slot, type Standing, type TickerItem, type Wave,
} from "../comp";
import { getAuth } from "./auth";
import { findMember, getDatabase } from "./db";
import { json, sameOrigin } from "./http";
import { readOwnProfile, readParentProfiles } from "./parent-profiles";
import type { ParentProfile } from "../parent-profile";

// Database side of cup day. Every read builds the same picture — config,
// entrants, heats, waves — and the pure functions in src/lib/comp.ts turn it
// into heat scores and the leaderboard, so the organiser board, the judge
// sheet and the public page never disagree.

export class CompError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const compRoute = (handler: APIRoute): APIRoute => async (context) => {
  try { return await handler(context); }
  catch (error) {
    if (error instanceof CompError || error instanceof RegistrationError) return json({ error: error.message }, error.status);
    console.error("Cup day request failed.");
    return json({ error: "The cup board is temporarily unavailable. Please retry." }, 503);
  }
};
export async function readCompBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new CompError("A request body is required.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > 8192) { await reader.cancel(); throw new CompError("Request is too large.", 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new CompError("Invalid JSON."); }
}

export type JudgeAccess = { email: string; name: string; organiser: boolean };
/** Any verified account can volunteer; approval is scoped to an individual heat. */
export async function cupAccess(request: Request): Promise<JudgeAccess> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) throw new CompError("Please sign in.", 401);
  const email = session.user.email.trim().toLowerCase();
  const member = await findMember(email);
  return { email, name: session.user.name, organiser: member?.role === "organiser" };
}
/** Who is judging: an invited judge for this edition, or an organiser. */
export async function judgeAccess(request: Request, edition = CUP_TERM): Promise<JudgeAccess> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) throw new CompError("Please sign in.", 401);
  const email = session.user.email.trim().toLowerCase();
  const [member, judge] = await Promise.all([
    findMember(email),
    getDatabase().query<{ name: string }>("SELECT name FROM cup_judge WHERE edition=$1 AND email=$2", [edition, email]),
  ]);
  const organiser = member?.role === "organiser";
  if (!judge.rows[0] && !organiser) throw new CompError("Judging needs an invitation from the club. Ask Andras to add your email.", 403);
  return { email, name: judge.rows[0]?.name ?? session.user.name, organiser };
}
export function requireCompOrigin(request: Request) { if (!sameOrigin(request)) throw new CompError("Invalid request origin.", 403); }

// ---------- Reads ----------

type Db = pg.Pool | pg.PoolClient;
async function serverTime(db: Db): Promise<string> {
  return (await db.query<{ now: Date }>("SELECT clock_timestamp() AS now")).rows[0].now.toISOString();
}
type ConfigRow = { edition: string; rounds: number; heat_size: number; final_size: number; live: boolean; version: number; plan: CupPlan | null; final_review: CupConfig["finalReview"] };
type HeatRow = { id: string; stage: "round" | "final"; round: number; number: number; status: HeatStatus; started_at: Date | null; finished_at: Date | null; judges: string[]; duration_minutes: number; ends_at: Date | null };
type SlotRow = { heat_id: string; kid_id: string; colour: Rashie };
type WaveRow = { id: string; heat_id: string; kid_id: string; judge_email: string; wave: number; score: string };

const configFromRow = (row: ConfigRow): CupConfig => ({ edition: row.edition, rounds: row.rounds, heatSize: row.heat_size, finalSize: row.final_size, live: row.live, version: row.version, plan: row.plan, finalReview: row.final_review });
const waveFromRow = (row: WaveRow): Wave => ({ id: row.id, heatId: row.heat_id, kidId: row.kid_id, judge: row.judge_email, wave: row.wave, score: Number(row.score) });

export async function readConfig(db: Db = getDatabase(), edition = CUP_TERM, lock = false): Promise<CupConfig> {
  const { rows } = await db.query<ConfigRow>(`SELECT * FROM cup_event WHERE edition=$1${lock ? " FOR UPDATE" : ""}`, [edition]);
  if (!rows[0]) throw new CompError("This Cup edition is not set up.", 404);
  return configFromRow(rows[0]);
}

// Who is coming: every kid with a cup entry, age from their latest signed form.
export async function readEntrants(db: Db = getDatabase(), edition = CUP_TERM): Promise<Entrant[]> {
  const { rows } = await db.query(
    `SELECT k.id, k.name, c.member, (SELECT updated_at FROM club_kid_photo WHERE kid_id=k.id) AS photo_version,
      (SELECT ${correctedBirthDateSql("w")} FROM club_signed_waiver w WHERE kid_id=k.id ORDER BY signed_at DESC LIMIT 1) AS dob
    FROM club_cup_entry c JOIN club_kid k ON k.id=c.kid_id
    WHERE c.edition=$1 AND k.archived_at IS NULL ORDER BY lower(k.name), k.id`,
    [edition],
  );
  return rows.map((row) => ({ id: row.id, name: row.name, member: row.member, age: row.dob ? ageAt(row.dob) : null, photoVersion: row.photo_version ? new Date(row.photo_version).toISOString() : null }));
}

export async function readHeats(db: Db = getDatabase(), edition = CUP_TERM): Promise<Heat[]> {
  const heats = await db.query<HeatRow>("SELECT id, stage, round, number, status, started_at, finished_at, judges, duration_minutes, ends_at FROM cup_heat WHERE edition=$1", [edition]);
  const slots = await db.query<SlotRow>(
    "SELECT s.heat_id, s.kid_id, s.colour FROM cup_heat_slot s JOIN cup_heat h ON h.id=s.heat_id WHERE h.edition=$1 ORDER BY array_position($2::text[], s.colour)",
    [edition, [...RASHIES]],
  );
  return heats.rows.map((row) => ({
    id: row.id, stage: row.stage, round: row.round, number: row.number, status: row.status, judges: row.judges, durationMinutes: row.duration_minutes, endsAt: row.ends_at?.toISOString() ?? null,
    startedAt: row.started_at?.toISOString() ?? null, finishedAt: row.finished_at?.toISOString() ?? null,
    slots: slots.rows.filter((slot) => slot.heat_id === row.id).map((slot) => ({ kidId: slot.kid_id, colour: slot.colour })),
  })).sort(byRunningOrder);
}

export async function readWaves(db: Db = getDatabase(), edition = CUP_TERM, judge?: string): Promise<Wave[]> {
  const { rows } = await db.query<WaveRow>(
    `SELECT w.id, w.heat_id, w.kid_id, w.judge_email, w.wave, w.score FROM cup_wave w JOIN cup_heat h ON h.id=w.heat_id
    WHERE h.edition=$1 AND ($2::text IS NULL OR w.judge_email=$2) ORDER BY w.wave`,
    [edition, judge ?? null],
  );
  return rows.map(waveFromRow);
}

export async function readJudges(db: Db = getDatabase(), edition = CUP_TERM): Promise<Judge[]> {
  return (await db.query<Judge>("SELECT email, name FROM cup_judge WHERE edition=$1 ORDER BY created_at, email", [edition])).rows;
}

export async function readTicker(db: Db = getDatabase(), edition = CUP_TERM, limit = 30): Promise<TickerItem[]> {
  const { rows } = await db.query("SELECT id::text, kind, message, created_at FROM cup_ticker WHERE edition=$1 ORDER BY created_at DESC, id DESC LIMIT $2", [edition, limit]);
  return rows.map((row) => ({ id: row.id, kind: row.kind, message: row.message, at: row.created_at.toISOString() }));
}

export type CompState = { serverNow: string; parents: ParentProfile[]; volunteers: HeatVolunteer[]; config: CupConfig; entrants: Entrant[]; heats: Heat[]; judges: Judge[]; waves: Wave[]; ticker: TickerItem[]; standings: Standing[] };
/** Everything the organiser board shows. */
export async function loadState(edition = CUP_TERM): Promise<CompState> {
  await expireHeats(edition);
  const db = getDatabase();
  const [config, entrants, heats, judges, waves, ticker, parents, volunteers] = await Promise.all([
    readConfig(db, edition), readEntrants(db, edition), readHeats(db, edition), readJudges(db, edition), readWaves(db, edition), readTicker(db, edition), readParentProfiles(), readVolunteers(db, edition),
  ]);
  return { serverNow: await serverTime(db), parents, volunteers, config, entrants, heats, judges, waves, ticker, standings: standings(config, entrants, heats, waves) };
}

export async function readVolunteers(db: Db = getDatabase(), edition = CUP_TERM, email?: string): Promise<HeatVolunteer[]> {
  return (await db.query<HeatVolunteer>(`SELECT v.heat_id AS "heatId", v.email, v.status FROM cup_heat_volunteer v JOIN cup_heat h ON h.id=v.heat_id
    WHERE h.edition=$1 AND ($2::text IS NULL OR v.email=$2) ORDER BY v.requested_at`, [edition, email ?? null])).rows;
}

/** A live workspace for every signed-in parent, before and after approval. */
export async function loadJudgeState(judge: JudgeAccess, edition = CUP_TERM) {
  await expireHeats(edition);
  const db = getDatabase();
  const [config, entrants, heats, waves, volunteers, profile] = await Promise.all([
    readConfig(db, edition), readEntrants(db, edition), readHeats(db, edition), readWaves(db, edition, judge.email), readVolunteers(db, edition, judge.email), readOwnProfile(judge.email, judge.name),
  ]);
  const assignedKids = new Set(heats.filter((heat) => heat.judges.includes(judge.email)).flatMap((heat) => heat.slots.map((slot) => slot.kidId)));
  const kids = Object.fromEntries(entrants.map((kid) => [kid.id, { id: kid.id, name: kid.name, age: kid.age, photoVersion: assignedKids.has(kid.id) ? kid.photoVersion : null }]));
  return { serverNow: await serverTime(db), profile, volunteers, judge: { ...judge, name: profile.name || judge.name }, config: { rounds: config.rounds, heatSize: config.heatSize }, timetable: cupTimetable(config, entrants.length, heats), kids,
    heats: heats.map((heat) => ({ ...heat, judges: heat.judges.filter((email) => email === judge.email) })), waves };
}

/** The public page: names and scores only, nothing else about the kids, and nothing at all until the board is live. */
export async function loadLive(edition = CUP_TERM) {
  await expireHeats(edition);
  const db = getDatabase();
  const config = await readConfig(db, edition);
  if (!config.live) return { live: false as const, name: CUP_LABEL };
  const [entrants, heats, waves, ticker] = await Promise.all([readEntrants(db, edition), readHeats(db, edition), readWaves(db, edition), readTicker(db, edition, 12)]);
  const names = new Map(entrants.map((kid) => [kid.id, publicName(kid.name)]));
  const board = standings(config, entrants, heats, waves);
  const publicHeat = (heat: Heat) => {
    const results = heatResults(heat, waves);
    return {
      id: heat.id, stage: heat.stage, round: heat.round, number: heat.number, label: heatLabel(heat), status: heat.status, startedAt: heat.startedAt, endsAt: heat.endsAt, durationMinutes: heat.durationMinutes,
      surfers: heat.slots.map((slot) => ({ name: names.get(slot.kidId) ?? "?", colour: slot.colour, score: results.get(slot.kidId)?.score ?? null, ...(config.plan ? { place: board.find(row => row.kidId === slot.kidId)?.finalPlace ?? null } : {}) })),
    };
  };
  const running = heats.filter((heat) => heat.status === "running").map(publicHeat);
  const upNext = heats.filter((heat) => heat.status === "scheduled").slice(0, 2).map(publicHeat);
  const finalHeat = heats.find((heat) => heat.stage === "final" && heat.number === 1);
  const final = finalHeat ? publicHeat(finalHeat) : null;
  return {
    live: true as const, guided: !!config.plan, timetable: (() => { const table = cupTimetable(config, entrants.length, heats); return table && { ...table, rows: table.rows.map(({ slots, ...row }) => ({ ...row, surfers: slots.map(slot => ({ name: names.get(slot.kidId) ?? "?", colour: slot.colour })) })) }; })(), name: CUP_LABEL, updatedAt: await serverTime(db), rounds: config.rounds,
    running, upNext, ticker,
    leaderboard: board.map(({ kidId: _kidId, ...row }) => ({ ...row, name: publicName(row.name) })),
    final: final && { ...final, surfers: [...final.surfers].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)) },
    heats: heats.map(publicHeat),
  };
}

export type LineupSurfer = { number: number; name: string; age: number | null; member: boolean; heat: { label: string; colour: Rashie } | null };
/** The public lineup for the Cup page: who is in, in the order they signed up.
 *  Public names only; a heat and rashie colour once the board is live. */
export async function loadLineup(edition = CUP_TERM): Promise<{ name: string; surfers: LineupSurfer[] }> {
  const db = getDatabase();
  const semester = await getSemester();
  const [entries, event] = await Promise.all([
    db.query(
      `SELECT k.id, k.name, c.member OR ${memberPaidSql("k.id", "$2")} AS member,
        (SELECT ${correctedBirthDateSql("w")} FROM club_signed_waiver w WHERE kid_id=k.id ORDER BY signed_at DESC LIMIT 1) AS dob
      FROM club_cup_entry c JOIN club_kid k ON k.id=c.kid_id
      WHERE c.edition=$1 AND k.archived_at IS NULL ORDER BY c.created_at, k.id`,
      [edition, semester.id],
    ),
    db.query<{ live: boolean }>("SELECT live FROM cup_event WHERE edition=$1", [edition]),
  ]);
  const heats = event.rows[0]?.live ? (await readHeats(db, edition)).filter((heat) => heat.stage === "round" && heat.round === 1) : [];
  const drawn = new Map(heats.flatMap((heat) => heat.slots.map((slot) => [slot.kidId, { label: heatLabel(heat), colour: slot.colour }])));
  return {
    name: CUP_LABEL,
    surfers: entries.rows.map((row, index) => ({
      number: index + 1, name: publicName(row.name), age: row.dob ? ageAt(row.dob) : null, member: Boolean(row.member), heat: drawn.get(row.id) ?? null,
    })),
  };
}

// ---------- Writes ----------

async function transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

const wavesIn = async (client: pg.PoolClient, where: string, params: unknown[]) =>
  (await client.query(`SELECT 1 FROM cup_wave w JOIN cup_heat h ON h.id=w.heat_id WHERE ${where} LIMIT 1`, params)).rowCount !== 0;

export async function updateConfig(patch: { rounds?: number; heatSize?: number; finalSize?: number; live?: boolean; plan?: CupPlan }, version: number, edition = CUP_TERM) {
  return transaction(async (client) => {
    const current = await readConfig(client, edition, true);
    if (patch.plan && (await readHeats(client, edition)).length) throw new CompError("Set the format and timetable before drawing heats. Delete unstarted draws first.", 409);
    if ((current.plan || patch.plan) && ((patch.rounds !== undefined && patch.rounds !== 3) || (patch.heatSize !== undefined && patch.heatSize !== 4) || (patch.finalSize !== undefined && patch.finalSize !== 4))) throw new CompError("The guided format gives every child three rounds and a placement final, with up to four per heat.", 409);
    const { rowCount, rows } = await client.query<ConfigRow>(
      `UPDATE cup_event SET rounds=COALESCE($3,rounds), heat_size=COALESCE($4,heat_size), final_size=COALESCE($5,final_size), live=COALESCE($6,live), plan=COALESCE($7::jsonb,plan), version=version+1, updated_at=now()
      WHERE edition=$1 AND version=$2 RETURNING *`,
      [edition, version, patch.plan ? 3 : patch.rounds ?? null, patch.plan ? 4 : patch.heatSize ?? null, patch.plan ? 4 : patch.finalSize ?? null, patch.live ?? null, patch.plan ? JSON.stringify(patch.plan) : null],
    );
    if (!rowCount) throw new CompError("The settings changed in another window. Reload the board and try again.", 409);
    // Rounds beyond the new count would be orphaned; refuse rather than drop drawn heats.
    const beyond = await client.query("SELECT 1 FROM cup_heat WHERE edition=$1 AND stage='round' AND round>$2 LIMIT 1", [edition, rows[0].rounds]);
    if (beyond.rowCount) throw new CompError("Delete the extra rounds' heats before reducing the number of rounds.", 409);
    return configFromRow(rows[0]);
  });
}

async function insertHeats(client: pg.PoolClient, edition: string, stage: "round" | "final", round: number, heats: Slot[][], minutes = 10) {
  for (const [index, slots] of heats.entries()) {
    const { rows } = await client.query("INSERT INTO cup_heat (edition, stage, round, number, duration_minutes) VALUES ($1,$2,$3,$4,$5) RETURNING id", [edition, stage, round, index + 1, minutes]);
    for (const slot of slots) await client.query("INSERT INTO cup_heat_slot (heat_id, kid_id, colour) VALUES ($1,$2,$3)", [rows[0].id, slot.kidId, slot.colour]);
  }
}

/** Draws (or redraws) a qualifying round. Refused once a wave in it has been scored. */
export async function drawRoundInDb(round: number, edition = CUP_TERM) {
  return transaction(async (client) => {
    const config = await readConfig(client, edition, true);
    if (round > config.rounds) throw new CompError(`This Cup has ${config.rounds} round${config.rounds === 1 ? "" : "s"}. Raise the number of rounds first.`);
    if (await wavesIn(client, "h.edition=$1 AND h.stage='round' AND h.round=$2", [edition, round])) throw new CompError("Judges have already scored this round. Move kids by hand instead of redrawing.", 409);
    const entrants = await readEntrants(client, edition);
    if (!entrants.length) throw new CompError("Nobody has registered for the Cup yet.", 409);
    const allHeats = await readHeats(client, edition);
    if (config.plan) {
      if (round === 1 && (cupTimetable(config, entrants.length, [])?.spareMinutes ?? 0) < 0) throw new CompError("This draw will run past the finish time. Adjust timing or the entry count before drawing.", 409);
      if (entrants.length < 2) throw new CompError("Register at least two surfers before drawing.", 409);
      const issue = roundReadiness(entrants, allHeats, round - 1);
      if (issue) throw new CompError(issue, 409);
      if (allHeats.some(h => h.stage === "final" || h.round > round || (h.round === round && h.status !== "scheduled"))) throw new CompError("This round has started or a later draw depends on it. Keep the completed draw.", 409);
    }
    const previous = allHeats.filter((heat) => heat.stage === "round" && heat.round < round);
    const waves = config.plan ? await readWaves(client, edition) : [];
    const slots = config.plan ? progressiveDraw(entrants, round, previous, standings(config, entrants, previous, waves), config.plan) : drawRound(entrants, round, config.heatSize, previous);
    await client.query("DELETE FROM cup_heat WHERE edition=$1 AND stage='round' AND round=$2", [edition, round]);
    await insertHeats(client, edition, "round", round, slots, config.plan?.heatMinutes);
  });
}

/** Builds the final from the leaderboard as it stands. */
export async function drawFinalInDb(edition = CUP_TERM, review?: { order: string[]; reason: string }) {
  return transaction(async (client) => {
    const config = await readConfig(client, edition, true);
    if (await wavesIn(client, "h.edition=$1 AND h.stage='final'", [edition])) throw new CompError("Judges have already scored the final.", 409);
    const [entrants, heats, waves] = await Promise.all([readEntrants(client, edition), readHeats(client, edition), readWaves(client, edition)]);
    let ranking = standings(config, entrants, heats.filter((heat) => heat.stage === "round"), waves);
    if (config.plan) {
      const issue = roundReadiness(entrants, heats, config.rounds);
      if (issue) throw new CompError(issue, 409);
      if (heats.some(h => h.stage === "final" && h.status !== "scheduled")) throw new CompError("The finals have started. Their groups are locked.", 409);
      if (boundaryTies(ranking).length && !review) throw new CompError("A tie crosses a final-group boundary. Review the tied surfers and record a surf-off or head-judge decision before building finals.", 409);
      if (review) {
        if (review.order.length !== ranking.length || new Set(review.order).size !== ranking.length || review.order.some(id => !ranking.some(row => row.kidId === id))) throw new CompError("The tie review must include every surfer exactly once.", 400);
        const ordered = review.order.map(id => ranking.find(row => row.kidId === id)!);
        if (ordered.some((row, i) => i > 0 && ordered[i - 1].rank > row.rank)) throw new CompError("Only equally ranked surfers can exchange places in a tie review.", 409);
        ranking = ordered;
      }
      const groups: Slot[][] = [];
      for (let i = 0; i < ranking.length; i += 4) groups.push(drawFinal(ranking.slice(i, i + 4), 4));
      if (!groups.length) throw new CompError("No surfers are ready for finals.", 409);
      await client.query("DELETE FROM cup_heat WHERE edition=$1 AND stage='final'", [edition]);
      await insertHeats(client, edition, "final", 0, groups, config.plan.heatMinutes);
      await client.query("UPDATE cup_event SET final_review=$2::jsonb WHERE edition=$1", [edition, review ? JSON.stringify(review) : null]);
      return;
    }
    const slots = drawFinal(ranking, config.finalSize);
    if (!slots.length) throw new CompError("Score a round first — the final takes the top of the leaderboard.", 409);
    await client.query("DELETE FROM cup_heat WHERE edition=$1 AND stage='final'", [edition]);
    await insertHeats(client, edition, "final", 0, [slots]);
  });
}

export async function deleteRoundInDb(round: number | "final", edition = CUP_TERM) {
  return transaction(async (client) => {
    const config = await readConfig(client, edition, true);
    if (config.plan) {
      const heats = await readHeats(client, edition);
      if (heats.some(h => (round === "final" ? h.stage === "final" : h.stage === "round" && h.round === round) && h.status !== "scheduled")) throw new CompError("Started heats cannot be deleted.", 409);
      if (round !== "final" && heats.some(h => h.stage === "final" || h.round > round)) throw new CompError("Delete later unstarted draws first.", 409);
    }
    const [stage, number] = round === "final" ? ["final", 0] : ["round", round];
    if (await wavesIn(client, "h.edition=$1 AND h.stage=$2 AND h.round=$3", [edition, stage, number])) throw new CompError("Judges have already scored these heats; they stay.", 409);
    await client.query("DELETE FROM cup_heat WHERE edition=$1 AND stage=$2 AND round=$3", [edition, stage, number]);
    if (config.plan) await client.query("UPDATE cup_event SET final_review=NULL WHERE edition=$1", [edition]);
  });
}

/** Puts a kid in a heat (out of any other heat of that round), changes their colour, or takes them out (heatId null). */
export async function moveSlot(input: { kidId: string; stage: "round" | "final"; round: number; heatId: string | null; colour?: Rashie; swapKidId?: string }, edition = CUP_TERM) {
  return transaction(async (client) => {
    const config = await readConfig(client, edition, true);
    const round = input.stage === "final" ? 0 : input.round;
    if (!(await client.query("SELECT 1 FROM club_cup_entry c JOIN club_kid k ON k.id=c.kid_id WHERE c.edition=$1 AND c.kid_id=$2 AND k.archived_at IS NULL", [edition, input.kidId])).rowCount)
      throw new CompError("This kid is not registered for the Cup.", 404);
    const current = await client.query<{ heat_id: string; colour: Rashie }>(
      "SELECT s.heat_id, s.colour FROM cup_heat_slot s JOIN cup_heat h ON h.id=s.heat_id WHERE h.edition=$1 AND h.stage=$2 AND h.round=$3 AND s.kid_id=$4 FOR UPDATE OF s",
      [edition, input.stage, round, input.kidId],
    );
    const allHeats = await readHeats(client, edition);
    if (config.plan) {
      const affected = new Set([...current.rows.map(row => row.heat_id), input.heatId]);
      if (allHeats.some(h => affected.has(h.id) && h.status !== "scheduled")) throw new CompError("Only unstarted heats can be edited.", 409);
      if (input.stage === "round" && allHeats.some(h => h.stage === "final" || h.round > round)) throw new CompError("A later draw already depends on this round.", 409);
      if (input.stage === "final" && (!current.rows.some(row => row.heat_id === input.heatId) || input.swapKidId)) throw new CompError("Final groups follow qualifying scores. Rebuild the finals with a tie review to change a boundary tie.", 409);
    }
    if (input.swapKidId) {
      const from = current.rows[0];
      const target = allHeats.find(h => h.id === input.heatId && h.stage === input.stage && h.round === round);
      const other = target?.slots.find(slot => slot.kidId === input.swapKidId);
      if (!from || !target || !other || from.heat_id === target.id) throw new CompError("Choose two surfers in different heats of the same round.", 400);
      if (await wavesIn(client, "(w.heat_id=$1 AND w.kid_id=$2) OR (w.heat_id=$3 AND w.kid_id=$4)", [from.heat_id, input.kidId, target.id, other.kidId])) throw new CompError("Scored surfers cannot swap heats.", 409);
      await client.query("DELETE FROM cup_heat_slot WHERE (heat_id=$1 AND kid_id=$2) OR (heat_id=$3 AND kid_id=$4)", [from.heat_id, input.kidId, target.id, other.kidId]);
      await client.query("INSERT INTO cup_heat_slot(heat_id,kid_id,colour) VALUES($1,$2,$3),($4,$5,$6)", [from.heat_id, other.kidId, from.colour, target.id, input.kidId, other.colour]);
      return;
    }
    const leaving = current.rows.filter((row) => row.heat_id !== input.heatId);
    for (const row of leaving) {
      if (await wavesIn(client, "w.heat_id=$1 AND w.kid_id=$2", [row.heat_id, input.kidId])) throw new CompError("This kid already has scores in that heat. Delete the scores first.", 409);
      await client.query("DELETE FROM cup_heat_slot WHERE heat_id=$1 AND kid_id=$2", [row.heat_id, input.kidId]);
    }
    if (!input.heatId) return;
    const heat = await client.query<{ id: string }>("SELECT id FROM cup_heat WHERE id=$1 AND edition=$2 AND stage=$3 AND round=$4 FOR UPDATE", [input.heatId, edition, input.stage, round]);
    if (!heat.rowCount) throw new CompError("Heat not found in this round.", 404);
    const taken = (await client.query<{ colour: Rashie; kid_id: string }>("SELECT colour, kid_id FROM cup_heat_slot WHERE heat_id=$1", [input.heatId])).rows;
    const staying = taken.find((slot) => slot.kid_id === input.kidId);
    const others = taken.filter((slot) => slot.kid_id !== input.kidId);
    const capacity = input.stage === "final" ? config.finalSize : config.heatSize;
    if (!staying && others.length >= capacity) throw new CompError(`That heat is full (${capacity}).`, 409);
    const used = new Set(others.map((slot) => slot.colour));
    if (input.colour && used.has(input.colour)) throw new CompError(`The ${rashieLabel[input.colour].toLowerCase()} rashie is already worn in that heat.`, 409);
    const colour = input.colour ?? staying?.colour ?? RASHIES.find((option) => !used.has(option));
    if (!colour) throw new CompError("No rashie left in that heat.", 409);
    if (staying) await client.query("UPDATE cup_heat_slot SET colour=$3 WHERE heat_id=$1 AND kid_id=$2", [input.heatId, input.kidId, colour]);
    else await client.query("INSERT INTO cup_heat_slot (heat_id, kid_id, colour) VALUES ($1,$2,$3)", [input.heatId, input.kidId, colour]);
  });
}

async function postTicker(client: Db, edition: string, kind: TickerItem["kind"], message: string) {
  await client.query("INSERT INTO cup_ticker (edition, kind, message) VALUES ($1,$2,$3)", [edition, kind, message]);
}

async function postHeatResult(client: Db, heat: Heat, edition: string) {
  const names = new Map((await readEntrants(client, edition)).map((kid) => [kid.id, kid.name]));
  const results = heatResults(heat, await readWaves(client, edition));
  const order = [...heat.slots].sort((a,b) => (results.get(b.kidId)?.score ?? -1) - (results.get(a.kidId)?.score ?? -1));
  await postTicker(client, edition, "result", `🏁 ${heatLabel(heat)} done — ${order.map((slot) => `${names.get(slot.kidId) ?? "?"} ${formatScore(results.get(slot.kidId)?.score ?? null)}`).join(" · ")}`);
}

/** Persist elapsed heats on the next feed read, even if the organiser closed the app.
 * The score permission check independently enforces the deadline on every write.
 */
export async function expireHeats(edition = CUP_TERM) {
  if (!(await getDatabase().query("SELECT 1 FROM cup_heat WHERE edition=$1 AND status='running' AND ends_at<=clock_timestamp() LIMIT 1", [edition])).rowCount) return;
  await transaction(async (client) => {
    await readConfig(client, edition, true);
    const { rows } = await client.query<{ id: string }>("UPDATE cup_heat SET status='done',finished_at=ends_at WHERE edition=$1 AND status='running' AND ends_at<=clock_timestamp() RETURNING id", [edition]);
    if (!rows.length) return;
    const heats = await readHeats(client, edition);
    for (const row of rows) await postHeatResult(client, heats.find((heat) => heat.id === row.id)!, edition);
  });
}

export async function setHeatDuration(heatId: string, minutes: number, edition = CUP_TERM) {
  await transaction(async (client) => {
    const config = await readConfig(client, edition, true);
    if (config.plan) throw new CompError("Guided heats use one duration so every child gets equal water time. Set it before drawing.", 409);
    const result = await client.query("UPDATE cup_heat SET duration_minutes=$3 WHERE id=$1 AND edition=$2 AND status='scheduled'", [heatId, edition, minutes]);
    if (!result.rowCount) throw new CompError("Set the duration before starting this heat.", 409);
  });
}

/** Starting establishes one immutable deadline; duplicate starts never extend it. */
export async function setHeatStatus(heatId: string, status: HeatStatus, edition = CUP_TERM) {
  await expireHeats(edition);
  return transaction(async (client) => {
    const config = await readConfig(client, edition, true);
    const allHeats = await readHeats(client, edition);
    const before = allHeats.find((heat) => heat.id === heatId);
    if (!before) throw new CompError("Heat not found.", 404);
    if (before.status === status) return;
    if (config.plan) {
      if (status === "scheduled") throw new CompError("Started guided heats cannot be reset.", 409);
      if (status === "done" && before.status !== "running") throw new CompError("Start the heat before finishing it.", 409);
      if (status === "running") {
        if (allHeats.some(h => h.status === "running")) throw new CompError("Finish the heat in the water first.", 409);
        if (allHeats.filter(h => byRunningOrder(h, before) < 0).some(h => h.status !== "done")) throw new CompError("Run the heats in timetable order.", 409);
        if (!before.slots.length || !before.judges.length) throw new CompError("Assign surfers and at least one judge before starting.", 409);
        const entrants = await readEntrants(client, edition);
        const issue = roundReadiness(entrants, allHeats, before.stage === "final" ? config.rounds : before.round - 1);
        if (issue) throw new CompError(issue, 409);
        const group = allHeats.filter(h => h.stage === before.stage && h.round === before.round);
        if (entrants.some(kid => group.flatMap(h => h.slots).filter(slot => slot.kidId === kid.id).length !== 1)) throw new CompError("Every registered child needs one slot in this round. Fix missing or duplicate surfers before starting.", 409);
      }
    }
    if (status === "running" && before.status !== "scheduled") throw new CompError("This heat has finished.", 409);
    if (status === "scheduled" && await wavesIn(client, "h.id=$1", [heatId])) throw new CompError("A scored heat cannot be reset.", 409);
    await client.query(`UPDATE cup_heat SET status=$3,
      started_at=CASE WHEN $3='running' THEN clock_timestamp() WHEN $3='scheduled' THEN NULL ELSE started_at END,
      ends_at=CASE WHEN $3='running' THEN clock_timestamp()+duration_minutes*interval '1 minute' WHEN $3='scheduled' THEN NULL ELSE ends_at END,
      finished_at=CASE WHEN $3='done' THEN clock_timestamp() ELSE NULL END,
      judges=CASE WHEN $3='scheduled' THEN '{}'::text[] ELSE judges END
      WHERE id=$1 AND edition=$2`, [heatId, edition, status]);
    if (status === "scheduled") { await client.query("DELETE FROM cup_heat_volunteer WHERE heat_id=$1", [heatId]); return; }
    const heat = (await readHeats(client, edition)).find((entry) => entry.id === heatId)!;
    if (status === "running") {
      const names = new Map((await readEntrants(client, edition)).map((kid) => [kid.id, kid.name]));
      await postTicker(client, edition, "heat", `🌊 ${heatLabel(heat)} is in the water — ${heat.slots.map((slot) => `${rashieDot[slot.colour]} ${names.get(slot.kidId) ?? "?"}`).join(" · ")}`);
    } else await postHeatResult(client, heat, edition);
  });
}

export async function volunteerForHeat(heatId: string, email: string, edition = CUP_TERM) {
  const profile = await readOwnProfile(email);
  if (!profile.name) throw new CompError("Save your name in your parent profile first.", 400);
  await transaction(async (client) => {
    await readConfig(client, edition, true);
    const { rows } = await client.query<{ judges: string[]; open: boolean }>(`SELECT judges, status<>'done' AND (status='scheduled' OR ends_at>clock_timestamp()) AS open FROM cup_heat WHERE id=$1 AND edition=$2`, [heatId, edition]);
    if (!rows[0]) throw new CompError("Heat not found.", 404);
    if (!rows[0].open) throw new CompError("This heat has finished.", 409);
    if (rows[0].judges.includes(email)) return;
    // A declined request stays declined; repeat taps cannot re-open an organiser's decision.
    await client.query("INSERT INTO cup_heat_volunteer(heat_id,email) VALUES($1,$2) ON CONFLICT DO NOTHING", [heatId, email]);
  });
}
export async function reviewVolunteer(heatId: string, email: string, decision: "approved" | "declined", actor: string, edition = CUP_TERM) {
  const profile = await readOwnProfile(email);
  await transaction(async (client) => {
    await readConfig(client, edition, true);
    const heat = await client.query("SELECT 1 FROM cup_heat WHERE id=$1 AND edition=$2 AND status<>'done' AND (status='scheduled' OR ends_at>clock_timestamp())", [heatId, edition]);
    if (!heat.rowCount) throw new CompError("This heat is no longer open for judge selection.", 409);
    const request = await client.query("UPDATE cup_heat_volunteer SET status=$3,reviewed_by=$4 WHERE heat_id=$1 AND email=$2 RETURNING email", [heatId, email, decision, actor]);
    if (!request.rowCount) throw new CompError("Volunteer request not found.", 404);
    if (decision === "approved") {
      await client.query("INSERT INTO cup_judge(edition,email,name,created_by) VALUES($1,$2,$3,$4) ON CONFLICT(edition,email) DO UPDATE SET name=EXCLUDED.name", [edition,email,profile.name,actor]);
      await client.query("UPDATE cup_heat SET judges=array_append(array_remove(judges,$2),$2) WHERE id=$1", [heatId,email]);
    } else await client.query("UPDATE cup_heat SET judges=array_remove(judges,$2) WHERE id=$1", [heatId,email]);
  });
}

export async function addJudge(judge: Judge, actor: string, edition = CUP_TERM) {
  await getDatabase().query(
    "INSERT INTO cup_judge (edition, email, name, created_by) VALUES ($1,$2,$3,$4) ON CONFLICT (edition, email) DO UPDATE SET name=EXCLUDED.name",
    [edition, judge.email, judge.name, actor],
  );
}
export async function setHeatJudges(heatId: string, judges: string[], edition = CUP_TERM) {
  await transaction(async (client) => {
    await readConfig(client, edition, true);
    const invited = new Set((await readJudges(client, edition)).map((judge) => judge.email));
    if (judges.some((email) => !invited.has(email))) throw new CompError("Invite each judge before selecting them for a heat.", 400);
    const { rowCount } = await client.query("UPDATE cup_heat SET judges=$3 WHERE id=$1 AND edition=$2 AND status<>'done' AND (status='scheduled' OR ends_at>clock_timestamp())", [heatId, edition, [...new Set(judges)]]);
    if (!rowCount) throw new CompError("This heat is no longer open for judge selection.", 409);
    await client.query("UPDATE cup_heat_volunteer SET status=CASE WHEN email=ANY($2::text[]) THEN 'approved' WHEN status='approved' THEN 'declined' ELSE status END WHERE heat_id=$1", [heatId, judges]);
  });
}
export async function removeJudge(email: string, edition = CUP_TERM) {
  await transaction(async (client) => {
    await readConfig(client, edition, true);
    email = email.trim().toLowerCase();
    const { rowCount } = await client.query("DELETE FROM cup_judge WHERE edition=$1 AND email=$2", [edition, email]);
    if (!rowCount) throw new CompError("Judge not found.", 404);
    await client.query("UPDATE cup_heat SET judges=array_remove(judges,$2) WHERE edition=$1", [edition, email]);
    await client.query("UPDATE cup_heat_volunteer v SET status='declined' FROM cup_heat h WHERE h.id=v.heat_id AND h.edition=$1 AND v.email=$2", [edition,email]);
  });
}

export async function addNote(message: string, edition = CUP_TERM) { await postTicker(getDatabase(), edition, "note", message); }
export async function removeTicker(id: string, edition = CUP_TERM) {
  if (!/^\d{1,18}$/.test(id)) throw new CompError("Not found.", 404);
  const { rowCount } = await getDatabase().query("DELETE FROM cup_ticker WHERE edition=$1 AND id=$2", [edition, id]);
  if (!rowCount) throw new CompError("Not found.", 404);
}

// ---------- Judging ----------

/** Serializes score writes with assignment changes: no organiser bypass. */
async function requireHeatJudge(client: pg.PoolClient, heatId: string, judge: string, edition: string) {
  await readConfig(client, edition, true);
  const { rows } = await client.query<{ judges: string[]; open: boolean }>("SELECT judges, status='running' AND ends_at>clock_timestamp() AS open FROM cup_heat WHERE id=$1 AND edition=$2", [heatId, edition]);
  if (!rows[0]) throw new CompError("Heat not found.", 404);
  if (!rows[0].judges.includes(judge)) throw new CompError("You are not selected to judge this heat.", 403);
  if (!rows[0].open) throw new CompError("Scoring is closed. You can score only while this heat is running.", 409);
}

/** Records a rating against the run number shared by all judges. */
export async function addWave(judge: string, input: { heatId: string; kidId: string; score: number; wave?: number }, edition = CUP_TERM): Promise<Wave> {
  return transaction(async (client) => {
    await requireHeatJudge(client, input.heatId, judge, edition);
    const slot = await client.query("SELECT 1 FROM cup_heat_slot s JOIN cup_heat h ON h.id=s.heat_id WHERE s.heat_id=$1 AND s.kid_id=$2 AND h.edition=$3 FOR UPDATE OF s", [input.heatId, input.kidId, edition]);
    if (!slot.rowCount) throw new CompError("That kid is not in this heat.", 404);
    const count = await client.query<{ n: number; next: number }>("SELECT count(*)::int AS n, COALESCE(max(wave),0)+1 AS next FROM cup_wave WHERE heat_id=$1 AND kid_id=$2 AND judge_email=$3", [input.heatId, input.kidId, judge]);
    if (count.rows[0].n >= MAX_WAVES) throw new CompError(`That is ${MAX_WAVES} waves already — only the best two count.`, 409);
    const run = input.wave ?? count.rows[0].next;
    if (run > MAX_WAVES) throw new CompError(`Choose a run from 1 to ${MAX_WAVES}.`, 400);
    if ((await client.query("SELECT 1 FROM cup_wave WHERE heat_id=$1 AND kid_id=$2 AND judge_email=$3 AND wave=$4", [input.heatId, input.kidId, judge, run])).rowCount) throw new CompError("You already rated this run. Select its score to edit it.", 409);
    const { rows } = await client.query<WaveRow>(
      "INSERT INTO cup_wave (heat_id, kid_id, judge_email, wave, score) SELECT $1,$2,$3,$4,$5 FROM cup_heat WHERE id=$1 AND status='running' AND ends_at>clock_timestamp() RETURNING id, heat_id, kid_id, judge_email, wave, score",
      [input.heatId, input.kidId, judge, run, input.score],
    );
    if (!rows[0]) throw new CompError("Scoring is closed for this heat.", 409);
    return waveFromRow(rows[0]);
  });
}
async function mutateWave(judge: string, id: string, score?: number, edition = CUP_TERM): Promise<Wave> {
  return transaction(async (client) => {
    await readConfig(client, edition, true);
    const { rows } = await client.query<WaveRow>("SELECT w.* FROM cup_wave w JOIN cup_heat h ON h.id=w.heat_id WHERE w.id=$1 AND w.judge_email=$2 AND h.edition=$3", [id, judge, edition]);
    if (!rows[0]) throw new CompError("Wave not found.", 404);
    await requireHeatJudge(client, rows[0].heat_id, judge, edition);
    const open = "EXISTS(SELECT 1 FROM cup_heat h WHERE h.id=cup_wave.heat_id AND h.status='running' AND h.ends_at>clock_timestamp())";
    const changed = score === undefined
      ? await client.query(`DELETE FROM cup_wave WHERE id=$1 AND ${open}`, [id])
      : await client.query(`UPDATE cup_wave SET score=$2, updated_at=now() WHERE id=$1 AND ${open}`, [id,score]);
    if (!changed.rowCount) throw new CompError("Scoring is closed for this heat.", 409);
    return waveFromRow({ ...rows[0], ...(score === undefined ? {} : { score: String(score) }) });
  });
}
export async function updateWave(judge: string, id: string, score: number): Promise<Wave> { return mutateWave(judge, id, score); }
export async function deleteWave(judge: string, id: string) { await mutateWave(judge, id); }

/** A kid's private profile photo for the judge sheet: only kids in the draw, only for judges and organisers. */
export async function readEntrantPhoto(kidId: string, edition = CUP_TERM): Promise<Buffer | null> {
  const { rows } = await getDatabase().query(
    "SELECT p.image FROM club_kid_photo p JOIN club_cup_entry c ON c.kid_id=p.kid_id JOIN club_kid k ON k.id=p.kid_id WHERE p.kid_id=$1 AND c.edition=$2 AND k.archived_at IS NULL",
    [kidId, edition],
  );
  return rows[0]?.image ?? null;
}

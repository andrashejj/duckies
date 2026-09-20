import type { APIRoute } from "astro";
import type pg from "pg";
import { CUP_LABEL, CUP_TERM, publicName } from "../registration/cup";
import { memberPaidSql, RegistrationError } from "../registration/records";
import { correctedBirthDateSql } from "../registration/birth-date-corrections";
import { ageAt } from "../registration/schema";
import { getSemester } from "../registration/semesters";
import {
  byRunningOrder, drawFinal, drawRound, formatScore, heatLabel, heatResults, MAX_WAVES, rashieDot, rashieLabel, RASHIES, standings,
  type CupConfig, type Entrant, type Heat, type HeatStatus, type Judge, type Rashie, type Slot, type Standing, type TickerItem, type Wave,
} from "../comp";
import { getAuth } from "./auth";
import { findMember, getDatabase } from "./db";
import { json, sameOrigin } from "./http";

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
type ConfigRow = { edition: string; rounds: number; heat_size: number; final_size: number; live: boolean; version: number };
type HeatRow = { id: string; stage: "round" | "final"; round: number; number: number; status: HeatStatus; started_at: Date | null; finished_at: Date | null };
type SlotRow = { heat_id: string; kid_id: string; colour: Rashie };
type WaveRow = { id: string; heat_id: string; kid_id: string; judge_email: string; wave: number; score: string };

const configFromRow = (row: ConfigRow): CupConfig => ({ edition: row.edition, rounds: row.rounds, heatSize: row.heat_size, finalSize: row.final_size, live: row.live, version: row.version });
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
  const heats = await db.query<HeatRow>("SELECT id, stage, round, number, status, started_at, finished_at FROM cup_heat WHERE edition=$1", [edition]);
  const slots = await db.query<SlotRow>(
    "SELECT s.heat_id, s.kid_id, s.colour FROM cup_heat_slot s JOIN cup_heat h ON h.id=s.heat_id WHERE h.edition=$1 ORDER BY array_position($2::text[], s.colour)",
    [edition, [...RASHIES]],
  );
  return heats.rows.map((row) => ({
    id: row.id, stage: row.stage, round: row.round, number: row.number, status: row.status,
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

export type CompState = { config: CupConfig; entrants: Entrant[]; heats: Heat[]; judges: Judge[]; waves: Wave[]; ticker: TickerItem[]; standings: Standing[] };
/** Everything the organiser board shows. */
export async function loadState(edition = CUP_TERM): Promise<CompState> {
  const db = getDatabase();
  const [config, entrants, heats, judges, waves, ticker] = await Promise.all([
    readConfig(db, edition), readEntrants(db, edition), readHeats(db, edition), readJudges(db, edition), readWaves(db, edition), readTicker(db, edition),
  ]);
  return { config, entrants, heats, judges, waves, ticker, standings: standings(config, entrants, heats, waves) };
}

/** A judge's sheet: the heats with who wears what, and only their own scores. */
export async function loadJudgeState(judge: JudgeAccess, edition = CUP_TERM) {
  const db = getDatabase();
  const [config, entrants, heats, waves] = await Promise.all([readConfig(db, edition), readEntrants(db, edition), readHeats(db, edition), readWaves(db, edition, judge.email)]);
  const kids = Object.fromEntries(entrants.map((kid) => [kid.id, { id: kid.id, name: kid.name, age: kid.age, photoVersion: kid.photoVersion }]));
  return { judge: { email: judge.email, name: judge.name, organiser: judge.organiser }, config: { rounds: config.rounds, heatSize: config.heatSize }, kids, heats, waves };
}

/** The public page: names and scores only, nothing else about the kids, and nothing at all until the board is live. */
export async function loadLive(edition = CUP_TERM) {
  const db = getDatabase();
  const config = await readConfig(db, edition);
  if (!config.live) return { live: false as const, name: CUP_LABEL };
  const [entrants, heats, waves, ticker] = await Promise.all([readEntrants(db, edition), readHeats(db, edition), readWaves(db, edition), readTicker(db, edition, 12)]);
  const names = new Map(entrants.map((kid) => [kid.id, kid.name]));
  const board = standings(config, entrants, heats, waves);
  const publicHeat = (heat: Heat) => {
    const results = heatResults(heat, waves);
    return {
      id: heat.id, stage: heat.stage, round: heat.round, number: heat.number, label: heatLabel(heat), status: heat.status, startedAt: heat.startedAt,
      surfers: heat.slots.map((slot) => ({ name: names.get(slot.kidId) ?? "?", colour: slot.colour, score: results.get(slot.kidId)?.score ?? null })),
    };
  };
  const running = heats.filter((heat) => heat.status === "running").map(publicHeat);
  const upNext = heats.filter((heat) => heat.status === "scheduled").slice(0, 2).map(publicHeat);
  const finalHeat = heats.find((heat) => heat.stage === "final");
  const final = finalHeat ? publicHeat(finalHeat) : null;
  return {
    live: true as const, name: CUP_LABEL, updatedAt: new Date().toISOString(), rounds: config.rounds,
    running, upNext, ticker,
    leaderboard: board.map(({ kidId: _kidId, ...row }) => row),
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

export async function updateConfig(patch: { rounds?: number; heatSize?: number; finalSize?: number; live?: boolean }, version: number, edition = CUP_TERM) {
  return transaction(async (client) => {
    const { rowCount, rows } = await client.query<ConfigRow>(
      `UPDATE cup_event SET rounds=COALESCE($3,rounds), heat_size=COALESCE($4,heat_size), final_size=COALESCE($5,final_size), live=COALESCE($6,live), version=version+1, updated_at=now()
      WHERE edition=$1 AND version=$2 RETURNING *`,
      [edition, version, patch.rounds ?? null, patch.heatSize ?? null, patch.finalSize ?? null, patch.live ?? null],
    );
    if (!rowCount) throw new CompError("The settings changed in another window. Reload the board and try again.", 409);
    // Rounds beyond the new count would be orphaned; refuse rather than drop drawn heats.
    const beyond = await client.query("SELECT 1 FROM cup_heat WHERE edition=$1 AND stage='round' AND round>$2 LIMIT 1", [edition, rows[0].rounds]);
    if (beyond.rowCount) throw new CompError("Delete the extra rounds' heats before reducing the number of rounds.", 409);
    return configFromRow(rows[0]);
  });
}

async function insertHeats(client: pg.PoolClient, edition: string, stage: "round" | "final", round: number, heats: Slot[][]) {
  for (const [index, slots] of heats.entries()) {
    const { rows } = await client.query("INSERT INTO cup_heat (edition, stage, round, number) VALUES ($1,$2,$3,$4) RETURNING id", [edition, stage, round, index + 1]);
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
    const previous = (await readHeats(client, edition)).filter((heat) => heat.stage === "round" && heat.round < round);
    await client.query("DELETE FROM cup_heat WHERE edition=$1 AND stage='round' AND round=$2", [edition, round]);
    await insertHeats(client, edition, "round", round, drawRound(entrants, round, config.heatSize, previous));
  });
}

/** Builds the final from the leaderboard as it stands. */
export async function drawFinalInDb(edition = CUP_TERM) {
  return transaction(async (client) => {
    const config = await readConfig(client, edition, true);
    if (await wavesIn(client, "h.edition=$1 AND h.stage='final'", [edition])) throw new CompError("Judges have already scored the final.", 409);
    const [entrants, heats, waves] = await Promise.all([readEntrants(client, edition), readHeats(client, edition), readWaves(client, edition)]);
    const slots = drawFinal(standings(config, entrants, heats.filter((heat) => heat.stage === "round"), waves), config.finalSize);
    if (!slots.length) throw new CompError("Score a round first — the final takes the top of the leaderboard.", 409);
    await client.query("DELETE FROM cup_heat WHERE edition=$1 AND stage='final'", [edition]);
    await insertHeats(client, edition, "final", 0, [slots]);
  });
}

export async function deleteRoundInDb(round: number | "final", edition = CUP_TERM) {
  return transaction(async (client) => {
    await readConfig(client, edition, true);
    const [stage, number] = round === "final" ? ["final", 0] : ["round", round];
    if (await wavesIn(client, "h.edition=$1 AND h.stage=$2 AND h.round=$3", [edition, stage, number])) throw new CompError("Judges have already scored these heats; they stay.", 409);
    await client.query("DELETE FROM cup_heat WHERE edition=$1 AND stage=$2 AND round=$3", [edition, stage, number]);
  });
}

/** Puts a kid in a heat (out of any other heat of that round), changes their colour, or takes them out (heatId null). */
export async function moveSlot(input: { kidId: string; stage: "round" | "final"; round: number; heatId: string | null; colour?: Rashie }, edition = CUP_TERM) {
  return transaction(async (client) => {
    const config = await readConfig(client, edition, true);
    const round = input.stage === "final" ? 0 : input.round;
    if (!(await client.query("SELECT 1 FROM club_cup_entry c JOIN club_kid k ON k.id=c.kid_id WHERE c.edition=$1 AND c.kid_id=$2 AND k.archived_at IS NULL", [edition, input.kidId])).rowCount)
      throw new CompError("This kid is not registered for the Cup.", 404);
    const current = await client.query<{ heat_id: string; colour: Rashie }>(
      "SELECT s.heat_id, s.colour FROM cup_heat_slot s JOIN cup_heat h ON h.id=s.heat_id WHERE h.edition=$1 AND h.stage=$2 AND h.round=$3 AND s.kid_id=$4 FOR UPDATE OF s",
      [edition, input.stage, round, input.kidId],
    );
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

/** Starts or finishes a heat and tells the ticker: who is in the water, then how it went. */
export async function setHeatStatus(heatId: string, status: HeatStatus, edition = CUP_TERM) {
  return transaction(async (client) => {
    const { rows } = await client.query<HeatRow>(
      `UPDATE cup_heat SET status=$3,
        started_at=CASE WHEN $3='running' THEN now() WHEN $3='scheduled' THEN NULL ELSE started_at END,
        finished_at=CASE WHEN $3='done' THEN now() ELSE NULL END
      WHERE id=$1 AND edition=$2 RETURNING id, stage, round, number, status, started_at, finished_at`,
      [heatId, edition, status],
    );
    const row = rows[0];
    if (!row) throw new CompError("Heat not found.", 404);
    if (status === "scheduled") return;
    const [heat] = (await readHeats(client, edition)).filter((entry) => entry.id === heatId);
    const names = new Map((await readEntrants(client, edition)).map((kid) => [kid.id, kid.name]));
    const label = heatLabel(heat);
    if (status === "running") {
      await postTicker(client, edition, "heat", `🌊 ${label} is in the water — ${heat.slots.map((slot) => `${rashieDot[slot.colour]} ${names.get(slot.kidId) ?? "?"}`).join(" · ")}`);
    } else {
      const results = heatResults(heat, await readWaves(client, edition));
      const order = [...heat.slots].sort((a, b) => (results.get(b.kidId)?.score ?? -1) - (results.get(a.kidId)?.score ?? -1));
      await postTicker(client, edition, "result", `🏁 ${label} done — ${order.map((slot) => `${names.get(slot.kidId) ?? "?"} ${formatScore(results.get(slot.kidId)?.score ?? null)}`).join(" · ")}`);
    }
  });
}

export async function addJudge(judge: Judge, actor: string, edition = CUP_TERM) {
  await getDatabase().query(
    "INSERT INTO cup_judge (edition, email, name, created_by) VALUES ($1,$2,$3,$4) ON CONFLICT (edition, email) DO UPDATE SET name=EXCLUDED.name",
    [edition, judge.email, judge.name, actor],
  );
}
export async function removeJudge(email: string, edition = CUP_TERM) {
  const { rowCount } = await getDatabase().query("DELETE FROM cup_judge WHERE edition=$1 AND email=$2", [edition, email.trim().toLowerCase()]);
  if (!rowCount) throw new CompError("Judge not found.", 404);
}

export async function addNote(message: string, edition = CUP_TERM) { await postTicker(getDatabase(), edition, "note", message); }
export async function removeTicker(id: string, edition = CUP_TERM) {
  if (!/^\d{1,18}$/.test(id)) throw new CompError("Not found.", 404);
  const { rowCount } = await getDatabase().query("DELETE FROM cup_ticker WHERE edition=$1 AND id=$2", [edition, id]);
  if (!rowCount) throw new CompError("Not found.", 404);
}

// ---------- Judging ----------

/** Appends a judge's next wave for a kid in a heat. */
export async function addWave(judge: string, input: { heatId: string; kidId: string; score: number }, edition = CUP_TERM): Promise<Wave> {
  return transaction(async (client) => {
    const slot = await client.query("SELECT 1 FROM cup_heat_slot s JOIN cup_heat h ON h.id=s.heat_id WHERE s.heat_id=$1 AND s.kid_id=$2 AND h.edition=$3 FOR UPDATE OF s", [input.heatId, input.kidId, edition]);
    if (!slot.rowCount) throw new CompError("That kid is not in this heat.", 404);
    const count = await client.query<{ n: number; next: number }>("SELECT count(*)::int AS n, COALESCE(max(wave),0)+1 AS next FROM cup_wave WHERE heat_id=$1 AND kid_id=$2 AND judge_email=$3", [input.heatId, input.kidId, judge]);
    if (count.rows[0].n >= MAX_WAVES) throw new CompError(`That is ${MAX_WAVES} waves already — only the best two count.`, 409);
    const { rows } = await client.query<WaveRow>(
      "INSERT INTO cup_wave (heat_id, kid_id, judge_email, wave, score) VALUES ($1,$2,$3,$4,$5) RETURNING id, heat_id, kid_id, judge_email, wave, score",
      [input.heatId, input.kidId, judge, count.rows[0].next, input.score],
    );
    return waveFromRow(rows[0]);
  });
}
export async function updateWave(judge: string, id: string, score: number): Promise<Wave> {
  const { rows } = await getDatabase().query<WaveRow>("UPDATE cup_wave SET score=$3, updated_at=now() WHERE id=$1 AND judge_email=$2 RETURNING id, heat_id, kid_id, judge_email, wave, score", [id, judge, score]);
  if (!rows[0]) throw new CompError("Wave not found.", 404);
  return waveFromRow(rows[0]);
}
export async function deleteWave(judge: string, id: string) {
  const { rowCount } = await getDatabase().query("DELETE FROM cup_wave WHERE id=$1 AND judge_email=$2", [id, judge]);
  if (!rowCount) throw new CompError("Wave not found.", 404);
}

/** A kid's private profile photo for the judge sheet: only kids in the draw, only for judges and organisers. */
export async function readEntrantPhoto(kidId: string, edition = CUP_TERM): Promise<Buffer | null> {
  const { rows } = await getDatabase().query(
    "SELECT p.image FROM club_kid_photo p JOIN club_cup_entry c ON c.kid_id=p.kid_id JOIN club_kid k ON k.id=p.kid_id WHERE p.kid_id=$1 AND c.edition=$2 AND k.archived_at IS NULL",
    [kidId, edition],
  );
  return rows[0]?.image ?? null;
}

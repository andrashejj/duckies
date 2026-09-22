import { test, expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";
import { signIn, sendCode } from "./auth-helpers";
import { CUP_TERM } from "../src/lib/registration/cup";
import { best2, heatResults, drawRound, heatSizes, standings, type Entrant, type Heat, type Wave } from "../src/lib/comp";

// Cup day: the draw, judging with selected profiles, the leaderboard and the public feed.
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329";
const organiser = "organiser@example.com";
const judgeEmail = "judge@example.com";
const post = (data: unknown) => ({ headers: { origin }, data });

// Ten kids born a year apart: the draw by age is easy to check.
const kids = ["Ana", "Ben", "Cleo", "Dev", "Eli", "Fay", "Gus", "Hana", "Ivo", "Jun"].map((name, index) => ({ name, dob: `${2019 - index}-03-01` }));
type Board = { config: { rounds: number; heatSize: number; finalSize: number; live: boolean; version: number }; entrants: Entrant[]; heats: Heat[]; waves: { id: string; heatId: string; kidId: string; judge: string; score: number }[]; judges: { email: string; name: string }[]; ticker: { kind: string; message: string }[]; standings: ReturnType<typeof standings> };

async function seedKids(guardian?: { name: string; email: string; phone: string }) {
  const ids: Record<string, string> = {};
  for (const kid of kids) {
    const { rows } = await db.query("INSERT INTO club_kid (name) VALUES ($1) RETURNING id", [kid.name]);
    ids[kid.name] = rows[0].id;
    await db.query("INSERT INTO club_cup_entry (kid_id, edition, member, contact_name, contact_phone) VALUES ($1,$2,true,'Parent','+230 5000 0000')", [rows[0].id, CUP_TERM]);
    const link = await db.query("INSERT INTO club_registration_link (kid_id, token_hash, term, expires_at, completed_at) VALUES ($1,$2,'2026-S2',now()+interval '1 day',now()) RETURNING id", [rows[0].id, `hash-${kid.name}`]);
    await db.query(
      `INSERT INTO club_signed_waiver (id,kid_id,link_id,term,signing_group,signed_at,snapshot,canonical_payload,payload_sha256,pdf,pdf_sha256,seal,public_key)
      VALUES (gen_random_uuid(),$1,$2,'2026-S2',gen_random_uuid(),now(),$3,'{}','x','\\x00','x','x','x')`,
      [rows[0].id, link.rows[0].id, JSON.stringify({ registration: { childName: kid.name, dateOfBirth: kid.dob, ...(guardian && kid.name === "Ana" ? { guardians: [guardian] } : {}) } })],
    );
  }
  return ids;
}
const board = async (request: APIRequestContext) => (await (await request.get("/api/admin/cup")).json()) as Board;
const heatsOf = (state: Board, round: number) => state.heats.filter((heat) => heat.stage === "round" && heat.round === round);

async function assign(request: APIRequestContext, heatId: string, emails = [organiser]) {
  expect((await request.put(`/api/admin/cup/heats/${heatId}/judges`, post({ judges: emails }))).status()).toBe(200);
  expect((await request.patch(`/api/admin/cup/heats/${heatId}`, post({ status: "running" }))).status()).toBe(200);
}

test.beforeEach(async () => {
  await db.query('TRUNCATE club_member_archive,club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit,cup_heat,cup_judge,cup_ticker,club_parent_profile CASCADE');
  await db.query("INSERT INTO club_member(email,role) VALUES ($1,'organiser')", [organiser]);
  await db.query("INSERT INTO club_parent_profile(email,name,phone) VALUES($1,'Organiser',''),($2,'Judy','')", [organiser, judgeEmail]);
  await db.query("INSERT INTO club_semester (id,label,starts_on,ends_on,child_fee_mur,family_fee_mur) VALUES ($1,'Sunset Duckies Cup Vol. 02','2026-10-16','2026-10-16',1000,1000) ON CONFLICT (id) DO NOTHING", [CUP_TERM]);
  await db.query("INSERT INTO cup_event (edition) VALUES ($1) ON CONFLICT (edition) DO UPDATE SET rounds=2, heat_size=4, final_size=4, live=false, version=1, plan=NULL, final_review=NULL", [CUP_TERM]);
});
test.afterAll(async () => { await db.end(); });

test("parents and volunteers are selected directly on a heat, with no email invitation", async ({ page, playwright }) => {
  const guardian = { name: "Ada Parent", email: "ada@example.com", phone: "+230 5000 1111" };
  const ids = await seedKids(guardian);
  await signIn(page.request, organiser);
  const state = await (await page.request.post("/api/admin/cup/rounds", post({ round: 1 }))).json() as Board;
  const heat = state.heats[0];
  await db.query("INSERT INTO cup_heat_volunteer(heat_id,email) VALUES($1,$2)", [heat.id, judgeEmail]);
  // Neither the old endpoint nor direct heat assignment can add arbitrary people.
  expect((await page.request.post("/api/admin/cup/judges", post({ email: "unknown@example.com" }))).status()).toBe(400);
  expect((await page.request.post("/api/admin/cup/judges", post({ email: guardian.email, name: "Fake name" }))).status()).toBe(400);
  expect((await page.request.put(`/api/admin/cup/heats/${heat.id}/judges`, post({ judges: [guardian.email, "unknown@example.com"] }))).status()).toBe(400);
  expect((await board(page.request)).judges).toHaveLength(0);
  expect((await board(page.request)).heats[0].judges).toHaveLength(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/cup");
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Round 1 · Heat 1", exact: true }) });
  await card.getByText("Choose judges", { exact: true }).click();
  await card.getByRole("searchbox", { name: "Find a parent or volunteer" }).fill("Ana");
  await expect(card.getByText("Parent of Ana", { exact: true })).toBeVisible();
  await card.getByRole("checkbox", { name: "Select Ada Parent", exact: true }).click();
  await expect(page.getByText("Heat judges saved.")).toBeVisible();
  await card.getByRole("searchbox").fill("Judy");
  await expect(card.getByText("Volunteered for this heat", { exact: true })).toBeVisible();
  await card.getByRole("checkbox", { name: "Select Judy", exact: true }).click();
  await expect.poll(async () => (await board(page.request)).heats[0].judges).toEqual([guardian.email, judgeEmail]);
  expect((await board(page.request)).judges).toEqual(expect.arrayContaining([{ email: guardian.email, name: guardian.name }, { email: judgeEmail, name: "Judy" }]));
  expect((await db.query("SELECT status,reviewed_by FROM cup_heat_volunteer WHERE heat_id=$1 AND email=$2", [heat.id, judgeEmail])).rows[0]).toEqual({ status: "approved", reviewed_by: organiser });
  await expect(page.getByLabel("Judge's email")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Invite", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/cup-judge-picker-mobile.png", fullPage: true });

  const judge = await playwright.request.newContext({ baseURL: origin });
  try {
    await signIn(judge, guardian.email);
    expect((await page.request.patch(`/api/admin/cup/heats/${heat.id}`, post({ status: "running" }))).status()).toBe(200);
    expect((await judge.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, score: 4 }))).status()).toBe(201);
    expect((await judge.post("/api/cup/judge/waves", post({ heatId: state.heats[1].id, kidId: ids.Eli, score: 4 }))).status()).toBe(403);
  } finally { await judge.dispose(); }
});

test("the draw: even heats, round 1 by age, later rounds shuffled with everyone once per round", () => {
  expect(heatSizes(14, 4)).toEqual([4, 4, 3, 3]);
  expect(heatSizes(8, 4)).toEqual([4, 4]);
  expect(heatSizes(5, 4)).toEqual([3, 2]);
  expect(heatSizes(0, 4)).toEqual([]);
  const entrants: Entrant[] = kids.map((kid, index) => ({ id: `k${index}`, name: kid.name, age: 7 + index, member: true, photoVersion: null }));
  const first = drawRound(entrants, 1, 4, []);
  expect(first.map((heat) => heat.map((slot) => slot.kidId))).toEqual([["k0", "k1", "k2", "k3"], ["k4", "k5", "k6"], ["k7", "k8", "k9"]]);
  expect(first[0].map((slot) => slot.colour)).toEqual(["red", "yellow", "blue", "green"]);
  const previous: Heat[] = first.map((slots, index) => ({ id: `h${index}`, stage: "round", round: 1, number: index + 1, status: "done", startedAt: null, finishedAt: null, durationMinutes: 10, endsAt: null, slots, judges: [] }));
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const second = drawRound(entrants, 2, 4, previous, random);
  expect(second.map((heat) => heat.length)).toEqual([4, 3, 3]);
  expect(second.flatMap((heat) => heat.map((slot) => slot.kidId)).sort()).toEqual(entrants.map((kid) => kid.id).sort());
  for (const heat of second) expect(new Set(heat.map((slot) => slot.colour)).size).toBe(heat.length);
  // The shuffle keeps round-1 heat-mates apart when the numbers allow: nobody meets all three of theirs again.
  const mates = new Map(first.flatMap((heat) => heat.map((slot) => [slot.kidId, heat.filter((other) => other !== slot).map((other) => other.kidId)] as const)));
  for (const heat of second) for (const slot of heat) expect(heat.filter((other) => mates.get(slot.kidId)!.includes(other.kidId)).length).toBeLessThan(3);
  // A kid keeps their colour only when every other colour is taken by a previous wearer.
  const k0 = second.flat().find((slot) => slot.kidId === "k0")!;
  expect(k0.colour).not.toBe("red");
});

test("organisers draw rounds, move kids and change rashies; scored heats stay put", async ({ request }) => {
  const ids = await seedKids();
  await signIn(request, organiser);
  let state = await board(request);
  expect(state.entrants).toHaveLength(10);
  expect(state.entrants.find((kid) => kid.name === "Ana")?.age).toBe(7);
  expect(state.heats).toHaveLength(0);

  expect((await request.post("/api/admin/cup/rounds", post({ round: 3 }))).status()).toBe(400);
  const drawn = await request.post("/api/admin/cup/rounds", post({ round: 1 }));
  expect(drawn.status()).toBe(201);
  state = await drawn.json();
  const round1 = heatsOf(state, 1);
  expect(round1.map((heat) => heat.slots.length)).toEqual([4, 3, 3]);
  expect(round1[0].slots.map((slot) => state.entrants.find((kid) => kid.id === slot.kidId)!.name)).toEqual(["Ana", "Ben", "Cleo", "Dev"]);
  expect(round1[0].slots.map((slot) => slot.colour)).toEqual(["red", "yellow", "blue", "green"]);

  state = await (await request.post("/api/admin/cup/rounds", post({ round: 2 }))).json();
  expect(heatsOf(state, 2).flatMap((heat) => heat.slots.map((slot) => slot.kidId)).sort()).toEqual(Object.values(ids).sort());

  // Move Jun (round 1, heat 3) into heat 2: heat 2 grows to 4, heat 3 shrinks; a full heat refuses.
  const [h1, h2, h3] = round1;
  const move = (kidId: string, heatId: string | null, colour?: string) => request.post("/api/admin/cup/slots", post({ kidId, stage: "round", round: 1, heatId, colour }));
  expect((await move(ids.Jun, h2.id)).status()).toBe(200);
  state = await board(request);
  expect(heatsOf(state, 1).map((heat) => heat.slots.length)).toEqual([4, 4, 2]);
  expect(heatsOf(state, 1)[1].slots.find((slot) => slot.kidId === ids.Jun)?.colour).toBe("green"); // the one rashie left
  expect((await move(ids.Ivo, h1.id)).status()).toBe(409); // full
  expect((await move(ids.Jun, h2.id, "red")).status()).toBe(409); // Eli's
  expect((await move(ids.Jun, h2.id, "green")).status()).toBe(200);
  // Out of the round altogether, then back into heat 3 in blue; red there is Hana's.
  expect((await move(ids.Jun, null)).status()).toBe(200);
  state = await board(request);
  expect(heatsOf(state, 1).map((heat) => heat.slots.length)).toEqual([4, 3, 2]);
  expect((await move(ids.Jun, h3.id, "blue")).status()).toBe(200);
  expect((await move(ids.Jun, h3.id, "red")).status()).toBe(409);
  expect(heatsOf(await board(request), 1)[2].slots.map((slot) => slot.colour)).toEqual(["red", "yellow", "blue"]);
  expect((await move("00000000-0000-0000-0000-000000000000", h3.id)).status()).toBe(404);

  await assign(request, h1.id);
  // Once a judge has scored a heat, that heat is not redrawn and the kid does not leave it.
  expect((await request.post("/api/cup/judge/waves", post({ heatId: h1.id, kidId: ids.Ana, score: 4 }))).status()).toBe(201);
  expect((await request.post("/api/admin/cup/rounds", post({ round: 1 }))).status()).toBe(409);
  expect((await request.delete("/api/admin/cup/rounds/1", { headers: { origin } })).status()).toBe(409);
  expect((await move(ids.Ana, h2.id)).status()).toBe(409);
  expect((await move(ids.Ana, h1.id, "blue")).status()).toBe(409); // blue is Cleo's
  expect((await move(ids.Ben, h2.id)).status()).toBe(200);
  expect((await request.delete("/api/admin/cup/rounds/2", { headers: { origin } })).status()).toBe(200);
  expect(heatsOf(await board(request), 2)).toHaveLength(0);

  // Settings are version-checked; rounds cannot drop below the heats already drawn.
  state = await board(request);
  expect((await request.patch("/api/admin/cup", post({ rounds: 3, version: state.config.version + 1 }))).status()).toBe(409);
  expect((await request.patch("/api/admin/cup", post({ rounds: 3, version: state.config.version }))).status()).toBe(200);
  state = await board(request);
  expect(state.config.rounds).toBe(3);
  expect((await request.patch("/api/admin/cup", post({ heatSize: 9, version: state.config.version }))).status()).toBe(400);
});

test("judges are selected from profiles, sign in without membership, score only their own waves; best two average onto the board", async ({ request, playwright }) => {
  const ids = await seedKids();
  await signIn(request, organiser);
  let state = (await (await request.post("/api/admin/cup/rounds", post({ round: 1 }))).json()) as Board;
  const heat = heatsOf(state, 1)[0];

  const judge = await playwright.request.newContext({ baseURL: origin });
  const stranger = await playwright.request.newContext({ baseURL: origin });
  try {
    // Not selected: no code is sent, and the sheet is closed.
    expect(await sendCode(stranger, "nobody@example.com")).toBeUndefined();
    expect((await request.post("/api/admin/cup/judges", post({ email: "not an email" }))).status()).toBe(400);
    const selected = await request.post("/api/admin/cup/judges", post({ email: "Judge@Example.com " }));
    expect(selected.status()).toBe(201);
    expect((await selected.json()).judges).toEqual([{ email: judgeEmail, name: "Judy" }]);
    await signIn(judge, judgeEmail);
    expect((await judge.get("/api/kids")).status()).toBe(401);
    expect((await judge.get("/api/admin/cup")).status()).toBe(403);
    expect((await judge.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, score: 4 }))).status()).toBe(403);
    expect((await request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, score: 4 }))).status()).toBe(403);
    await assign(request, heat.id, [judgeEmail, organiser]);
    const sheet = await (await judge.get("/api/cup/judge")).json();
    expect(sheet.judge).toEqual({ email: judgeEmail, name: "Judy", organiser: false });
    expect(sheet.heats).toHaveLength(3);
    expect(sheet.heats.filter((entry: Heat) => entry.judges.includes(judgeEmail))).toHaveLength(1);
    expect(sheet.kids[ids.Ana]).toMatchObject({ name: "Ana", age: 7, photoVersion: null });
    expect(sheet.kids[ids.Ana].contactPhone).toBeUndefined();

    // Judy scores Ana 4, 2, 5 and Ben 4; the organiser rates Ana’s first two runs 3, 3.
    const wave = async (context: APIRequestContext, kidId: string, score: number) => { const r = await context.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId, score })); expect(r.status()).toBe(201); return (await r.json()).wave; };
    const first = await wave(judge, ids.Ana, 4);
    await wave(judge, ids.Ana, 2);
    const third = await wave(judge, ids.Ana, 5);
    expect(third.wave).toBe(3);
    await wave(judge, ids.Ben, 4);
    expect((await judge.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Jun, score: 5 }))).status()).toBe(404);
    expect((await judge.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, score: 7.25 }))).status()).toBe(400);
    expect((await judge.post("/api/cup/judge/waves", { headers: { origin: "https://elsewhere.example" }, data: { heatId: heat.id, kidId: ids.Ana, score: 5 } })).status()).toBe(403);
    await wave(request, ids.Ana, 3);
    await wave(request, ids.Ana, 3);
    // Judy corrects her first wave down and cannot touch the organiser's.
    expect((await judge.patch(`/api/cup/judge/waves/${first.id}`, post({ score: 3 }))).status()).toBe(200);
    const organiserWave = ((await board(request)).waves).find((entry) => entry.judge === organiser)!;
    expect((await judge.patch(`/api/cup/judge/waves/${organiserWave.id}`, post({ score: 1 }))).status()).toBe(404);
    expect((await judge.delete(`/api/cup/judge/waves/${organiserWave.id}`, { headers: { origin } })).status()).toBe(404);
    expect((await (await judge.get("/api/cup/judge")).json()).waves).toHaveLength(4);

    state = await board(request);
    const ana = state.standings.find((row) => row.name === "Ana")!;
    expect(ana).toMatchObject({ rank: 1, rounds: [4, null], total: 4, heats: 1 }); // Run averages 3, 2.5, 5: best two average 4
    expect(state.standings.find((row) => row.name === "Ben")).toMatchObject({ rank: 2, total: 4 });
    expect(state.standings.find((row) => row.name === "Cleo")).toMatchObject({ rank: 3, total: 0 });
    expect(state.standings.find((row) => row.name === "Jun")).toMatchObject({ rank: 3, total: 0 });

    // Revoking a heat assignment blocks creation, correction and deletion immediately.
    expect((await request.put(`/api/admin/cup/heats/${heat.id}/judges`, post({ judges: [organiser] }))).status()).toBe(200);
    expect((await judge.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, score: 1 }))).status()).toBe(403);
    expect((await judge.patch(`/api/cup/judge/waves/${first.id}`, post({ score: 1 }))).status()).toBe(403);
    expect((await judge.delete(`/api/cup/judge/waves/${first.id}`, { headers: { origin } })).status()).toBe(403);
    expect((await (await judge.get("/api/cup/judge")).json()).heats.every((entry: Heat) => !entry.judges.includes(judgeEmail))).toBe(true);
    expect((await board(request)).standings.find((row) => row.name === "Ana")?.total).toBe(4);
    // Removed again: the sheet closes on the next request even with a live session.
    expect((await request.delete(`/api/admin/cup/judges/${encodeURIComponent(judgeEmail)}`, { headers: { origin } })).status()).toBe(200);
    expect((await judge.get("/api/cup/judge")).status()).toBe(200);
    expect((await judge.get("/cup/judge")).status()).toBe(200);
    expect((await judge.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, score: 5 }))).status()).toBe(403);
  } finally { await judge.dispose(); await stranger.dispose(); }
});

test("the public feed stays dark until switched live, then carries the ticker, the board and no private details", async ({ request, playwright }) => {
  const ids = await seedKids();
  await signIn(request, organiser);
  let state = (await (await request.post("/api/admin/cup/rounds", post({ round: 1 }))).json()) as Board;
  const [heat] = heatsOf(state, 1);
  const guest = await playwright.request.newContext({ baseURL: origin });
  try {
    expect(await (await guest.get("/api/cup/live")).json()).toEqual({ live: false, name: "Sunset Duckies Cup Vol. 02" });
    expect((await guest.get("/cup/judge", { maxRedirects: 0 })).status()).toBe(200);
    expect((await guest.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, score: 5 }))).status()).toBe(401);
    expect((await guest.get("/api/cup/judge")).status()).toBe(401);
    expect((await guest.get(`/api/cup/photo/${ids.Ana}`)).status()).toBe(401);
    expect((await guest.get("/api/admin/cup")).status()).toBe(401);

    expect((await request.patch(`/api/admin/cup/heats/${heat.id}`, post({ status: "running" }))).status()).toBe(200);
    await assign(request, heat.id);
    await request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Dev, score: 5 }));
    await request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Dev, score: 3 }));
    await request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, score: 5 }));
    expect((await request.patch(`/api/admin/cup/heats/${heat.id}`, post({ status: "done" }))).status()).toBe(200);
    expect((await request.post("/api/admin/cup/ticker", post({ message: "BBQ is on 🔥" }))).status()).toBe(201);
    state = await board(request);
    expect(state.ticker.map((item) => item.kind)).toEqual(["note", "result", "heat"]);
    expect(state.ticker[2].message).toContain("Round 1 · Heat 1 is in the water — 🔴 Ana · 🟡 Ben · 🔵 Cleo · 🟢 Dev");
    expect(state.ticker[1].message).toBe("🏁 Round 1 · Heat 1 done — Ana 5 · Dev 4 · Ben — · Cleo —");

    expect((await request.patch("/api/admin/cup", post({ live: true, version: state.config.version }))).status()).toBe(200);
    const live = await (await guest.get("/api/cup/live")).json();
    expect(live.live).toBe(true);
    expect(live.leaderboard[0]).toMatchObject({ rank: 1, name: "Ana", age: 7, total: 5, rounds: [5, null] });
    expect(live.leaderboard[0].kidId).toBeUndefined();
    expect(JSON.stringify(live)).not.toMatch(/photo|contact|phone|email/i);
    expect(live.ticker).toHaveLength(3);
    expect(live.running).toHaveLength(0);
    expect(live.upNext.map((entry: { label: string }) => entry.label)).toEqual(["Round 1 · Heat 2", "Round 1 · Heat 3"]);
    expect(live.heats[0].surfers).toEqual([
      { name: "Ana", colour: "red", score: 5 }, { name: "Ben", colour: "yellow", score: null }, { name: "Cleo", colour: "blue", score: null }, { name: "Dev", colour: "green", score: 4 },
    ]);
    // The page shell is static: the names only ever travel through the feed.
    const page = await guest.get("/sunset-duckies-cup-vol-2/live");
    expect(page.status()).toBe(200);
    expect(await page.text()).not.toMatch(/\bCleo\b/);

    // The final takes the top of the leaderboard as it stands.
    expect((await request.post("/api/admin/cup/final", post({}))).status()).toBe(201);
    state = await board(request);
    const final = state.heats.find((entry) => entry.stage === "final")!;
    expect(final.slots.map((slot) => state.entrants.find((kid) => kid.id === slot.kidId)!.name)).toEqual(["Ana", "Dev", "Ben", "Cleo"]);
    expect(final.slots.map((slot) => slot.colour)).toEqual(["red", "yellow", "blue", "green"]);
    await assign(request, final.id);
    await request.post("/api/cup/judge/waves", post({ heatId: final.id, kidId: ids.Ana, score: 5 }));
    expect((await request.post("/api/admin/cup/final", post({}))).status()).toBe(409);
    const after = await (await guest.get("/api/cup/live")).json();
    expect(after.final.surfers[0]).toEqual({ name: "Ana", colour: "red", score: 5 });
    expect(after.leaderboard.find((row: { name: string }) => row.name === "Ana")).toMatchObject({ total: 5, final: 5 });
  } finally { await guest.dispose(); }
});

test("the judge sheet and the live board render on a phone", async ({ page, playwright }) => {
  const ids = await seedKids();
  const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    await signIn(admin, organiser);
    await admin.post("/api/admin/cup/rounds", post({ round: 1 }));
    await admin.post("/api/admin/cup/judges", post({ email: judgeEmail }));
    const state = await board(admin);
    await assign(admin, heatsOf(state, 1)[1].id, [judgeEmail]);
    await admin.patch(`/api/admin/cup/heats/${heatsOf(state, 1)[1].id}`, post({ status: "running" }));
    await admin.patch("/api/admin/cup", post({ live: true, version: state.config.version }));
  } finally { await admin.dispose(); }
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page.request, judgeEmail);
  await page.goto("/cup/judge");
  await expect(page.getByRole("heading", { name: "Score the waves." })).toBeVisible();
  // Lands on the heat in the water (the first render waits for the dev server to build the island).
  await expect(page.getByRole("tab", { name: "R1·H2" })).toHaveAttribute("aria-selected", "true", { timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Round 1 · Heat 2" }).first()).toBeVisible();
  const eli = page.getByRole("article", { name: "Eli, red rashie" });
  await eli.getByRole("button", { name: "3 stars", exact: true }).click();
  await expect(eli.getByRole("button", { name: "W1 3 ★" })).toBeVisible();
  await eli.getByRole("button", { name: "5 stars", exact: true }).click();
  await expect(eli).toContainText("4");
  await eli.getByRole("button", { name: "W1 3 ★" }).click();
  await eli.getByRole("button", { name: "4 stars", exact: true }).click();
  await expect(eli.getByRole("button", { name: "W1 4 ★" })).toBeVisible();
  await expect(eli).toContainText("4.5");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/cup-judge-mobile.png", fullPage: true });
  expect((await db.query("SELECT score::float AS score FROM cup_wave WHERE kid_id=$1 ORDER BY wave", [ids.Eli])).rows.map((row) => row.score)).toEqual([4, 5]);

  await page.goto("/sunset-duckies-cup-vol-2/live");
  await expect(page.getByText("● in the water now")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Round 1 · Heat 2" }).first()).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Eli");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/cup-live-mobile.png", fullPage: true });
});

test("the organiser board draws, drags a kid between heats, runs a heat and goes live", async ({ page }) => {
  await seedKids();
  await page.setViewportSize({ width: 1380, height: 1200 });
  await signIn(page.request, organiser);
  await page.goto("/admin/cup");
  await expect(page.getByRole("heading", { name: "10 kids in the draw" })).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Draw round 1" }).click();
  await expect(page.getByText("Round 1 drawn.")).toBeVisible();
  const heat1 = page.getByRole("article").filter({ hasText: "Round 1 · Heat 1" });
  const heat3 = page.getByRole("article").filter({ hasText: "Round 1 · Heat 3" });
  await expect(heat1).toContainText("4/4");
  await expect(heat3).toContainText("3/4");
  await heat1.getByText("Choose judges", { exact: true }).click();
  await heat1.getByRole("checkbox", { name: "Select Organiser", exact: true }).click();
  await expect(heat1.getByRole("checkbox", { name: "Select Organiser", exact: true })).toBeChecked();
  await expect(page.getByText("Heat judges saved.")).toBeVisible();
  expect((await board(page.request)).heats[0].judges).toEqual([organiser]);
  await heat1.getByText("Choose judges", { exact: true }).click();
  // Drag Dev out of the full heat 1 into heat 3.
  await heat1.getByRole("heading", { name: "Round 1 · Heat 1", exact: true }).scrollIntoViewIfNeeded();
  await heat1.getByRole("listitem").filter({ has: page.getByText("Dev", { exact: true }) }).dragTo(heat3);
  await expect(heat1).toContainText("3/4");
  await expect(heat3).toContainText("4/4");
  await expect(heat3.getByRole("listitem").filter({ has: page.getByText("Dev", { exact: true }) })).toContainText("10 yrs");
  // Phones use the menu instead: send Ana to heat 2, give her the green rashie.
  await heat1.getByLabel("Move Ana").selectOption({ label: "→ R1·H2" });
  const heat2 = page.getByRole("article").filter({ hasText: "Round 1 · Heat 2" });
  await expect(heat2.getByRole("listitem").filter({ has: page.getByText("Ana", { exact: true }) })).toBeVisible();
  await expect(heat2).toContainText("4/4");
  await expect(heat2.getByLabel("Ana's rashie")).toHaveValue("green");
  await heat2.getByRole("button", { name: "Start heat" }).click();
  await expect(heat2).toContainText("in the water");
  await expect(page.getByRole("listitem").filter({ hasText: "Heat 2 is in the water" })).toBeVisible();
  await page.getByRole("button", { name: "Leaderboard is hidden" }).click();
  await expect(page.getByRole("button", { name: "Leaderboard is LIVE" })).toBeVisible();
  expect(await page.getByRole("article").evaluateAll((cards) => cards.every((card) => [...card.querySelectorAll("li")].every((row) => row.getBoundingClientRect().right <= card.getBoundingClientRect().right)))).toBe(true);
  await page.screenshot({ path: "test-results/cup-admin-desktop.png", fullPage: true });
  expect((await db.query("SELECT live FROM cup_event WHERE edition=$1", [CUP_TERM])).rows[0].live).toBe(true);
});

test("ratings combine by run before the best two are chosen, across qualifying heats only", () => {
  const entrants: Entrant[] = ["Ana", "Ben", "Cleo"].map((name) => ({ id: name, name, age: 8, member: true, photoVersion: null }));
  const h1: Heat = { id: "h1", stage: "round", round: 1, number: 1, status: "running", startedAt: null, finishedAt: null, durationMinutes: 10, endsAt: null, judges: ["a", "b"], slots: [{ kidId: "Ana", colour: "red" }, { kidId: "Ben", colour: "blue" }, { kidId: "Cleo", colour: "green" }] };
  const h2: Heat = { ...h1, id: "h2", round: 2 };
  const final: Heat = { ...h1, id: "final", stage: "final", round: 0 };
  const rating = (kidId: string, judge: string, wave: number, score: number, heatId = "h1"): Wave => ({ id: `${heatId}-${kidId}-${judge}-${wave}`, heatId, kidId, judge, wave, score });
  const waves = [rating("Ana", "a", 1, 5), rating("Ana", "b", 1, 1), rating("Ana", "a", 2, 1), rating("Ana", "b", 2, 5), rating("Ana", "a", 3, 4), rating("Ana", "b", 3, 4), rating("Ben", "a", 1, 5)];
  expect(best2([])).toBe(0);
  expect(best2([5])).toBe(5);
  expect(best2([5, 3])).toBe(4);
  expect(best2([5, 3, 1])).toBe(4);
  expect(heatResults(h1, waves).get("Ben")).toMatchObject({ score: 5, waves: 1 });
  expect(heatResults(h1, waves).get("Ana")).toMatchObject({ score: 3.5, waves: 3 }); // 3, 3, 4; not best two from each judge
  expect(heatResults(h1, waves).get("Cleo")?.score).toBeNull();
  waves.push(rating("Ana", "a", 1, 5, "h2"), rating("Ana", "b", 1, 5, "h2"), rating("Ben", "a", 1, 5, "final"));
  const board = standings({ rounds: 2 }, entrants, [h1, h2, final], waves);
  expect(board[1]).toMatchObject({ name: "Ana", total: 4.5, rounds: [3.5, 5], rank: 2 });
  expect(board[0]).toMatchObject({ name: "Ben", total: 5, final: 5, rank: 1 });
});

test("public miniapp and signed-in spectator update the tableau and leaderboard without reloading", async ({ page, browser, request }) => {
  const ids = await seedKids();
  await signIn(request, organiser);
  const state = await (await request.post("/api/admin/cup/rounds", post({ round: 1 }))).json() as Board;
  const heat = heatsOf(state, 1)[0];
  const otherHeat = heatsOf(state, 1)[1];
  await assign(request, heat.id);
  expect((await request.put(`/api/admin/cup/heats/${otherHeat.id}/judges`, post({ judges: ["uninvited@example.com"] }))).status()).toBe(400);
  expect((await request.post("/api/cup/judge/waves", post({ heatId: otherHeat.id, kidId: ids.Eli, wave: 1, score: 5 }))).status()).toBe(403);
  await request.patch("/api/admin/cup", post({ live: true, version: state.config.version }));
  await page.goto("/cup/judge");
  await expect(page.getByRole("link", { name: "sign in to judge" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Heat tableau" })).toBeVisible();
  await expect(page.getByRole("button", { name: "5 stars", exact: true })).toHaveCount(0);

  const spectator = await browser.newContext({ baseURL: origin });
  try {
    await db.query("INSERT INTO club_member(email,role) VALUES ('spectator@example.com','member')");
    await signIn(spectator.request, "spectator@example.com");
    expect((await spectator.request.put(`/api/admin/cup/heats/${heat.id}/judges`, post({ judges: ["spectator@example.com"] }))).status()).toBe(403);
    expect((await spectator.request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, wave: 1, score: 5 }))).status()).toBe(403);
    const signedIn = await spectator.newPage();
    await signedIn.goto(`${origin}/cup/judge`);
    await expect(signedIn.getByRole("table")).toBeVisible();
    await expect(signedIn.getByRole("button", { name: "5 stars", exact: true })).toHaveCount(0);
    const first = await request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, wave: 1, score: 5 }));
    expect(first.status()).toBe(201);
    const { wave } = await first.json();
    expect((await request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, wave: 1, score: 2 }))).status()).toBe(409);
    for (const score of [0, 0.5, 2.5, 6]) expect((await request.patch(`/api/cup/judge/waves/${wave.id}`, post({ score }))).status()).toBe(400);
    for (const viewer of [page, signedIn]) {
      await expect(viewer.getByRole("row").filter({ has: viewer.getByRole("cell", { name: "Ana", exact: true }) }).getByRole("cell").nth(5)).toHaveText("5", { timeout: 10000 });
      const tableau = viewer.locator("section").filter({ has: viewer.getByRole("heading", { name: "Heat tableau" }) });
      await expect(tableau.getByRole("listitem").filter({ hasText: /^Ana/ })).toContainText("5");
    }
    // Removing a rating preserves run numbers; a later judge can still rate run 3.
    expect((await request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, wave: 3, score: 4 }))).status()).toBe(201);
    expect((await request.delete(`/api/cup/judge/waves/${wave.id}`, { headers: { origin } })).status()).toBe(200);
    await expect(page.getByRole("row").filter({ has: page.getByRole("cell", { name: "Ana", exact: true }) }).getByRole("cell").nth(5)).toHaveText("4", { timeout: 10000 });
    expect((await db.query("SELECT wave FROM cup_wave WHERE kid_id=$1", [ids.Ana])).rows).toEqual([{ wave: 3 }]);
  } finally { await spectator.close(); }
});

test("parents volunteer, organisers approve their profile, and the timed heat closes without any reload", async ({ page, browser, request, playwright }) => {
  test.setTimeout(90000);
  const parentEmail = "parent@example.com";
  const ids = await seedKids({ name: "Ana’s Mum", email: parentEmail, phone: "+230 5555 0101" });
  await signIn(request, organiser);
  const state = await (await request.post("/api/admin/cup/rounds", post({ round: 1 }))).json() as Board;
  const [heat, nextHeat] = heatsOf(state, 1);
  expect(heat.durationMinutes).toBe(10);
  await request.patch("/api/admin/cup", post({ live: true, version: state.config.version }));
  const adminContext = await browser.newContext({ baseURL: origin });
  const guest = await playwright.request.newContext({ baseURL: origin });
  try {
    await signIn(adminContext.request, organiser);
    const admin = await adminContext.newPage();
    await admin.goto("/admin/cup");
    const adminHeat = admin.getByRole("article").filter({ has: admin.getByRole("heading", { name: "Round 1 · Heat 1", exact: true }) });
    await adminHeat.getByLabel("Minutes for Round 1 · Heat 1").fill("2");
    await adminHeat.getByRole("button", { name: "Set duration" }).click();
    await expect(admin.getByText("Heat duration saved.")).toBeVisible();
    expect((await board(request)).heats[0].durationMinutes).toBe(2);

    // A guardian can sign in without a membership or a prior judge invitation.
    await signIn(page.request, parentEmail);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install();
    await page.goto("/cup/judge");
    await page.getByText("Your parent profile", { exact: true }).click();
    await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("Ana’s Mum");
    await page.getByLabel("Your name", { exact: true }).fill("Maya Parent");
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(page.getByText("Profile saved.", { exact: true })).toBeVisible();
    const portrait = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#ffca38" } }).png().toBuffer();
    await page.getByLabel("Photo for Maya Parent").setInputFiles({ name: "parent.png", mimeType: "image/png", buffer: portrait });
    await expect(page.getByRole("img", { name: "Maya Parent's profile" })).toBeVisible();
    await expect.poll(() => page.getByRole("img", { name: "Maya Parent's profile" }).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(512);
    expect((await guest.get(`/api/parents/photo?email=${parentEmail}`)).status()).toBe(401);
    expect((await page.request.get(`/api/parents/photo?email=${organiser}`)).status()).toBe(403);
    expect((await page.request.put(`/api/parents/photo?email=${organiser}`, { headers: { origin, "Content-Type": "image/png" }, data: portrait })).status()).toBe(403);

    await page.getByRole("button", { name: "Volunteer to judge this heat" }).click();
    await expect(page.getByText("Waiting for organiser approval.", { exact: false })).toBeVisible();
    const approval = adminHeat.getByRole("button", { name: "Approve Maya Parent" });
    await expect(approval).toBeVisible({ timeout: 10000 });
    await expect(adminHeat.getByRole("img", { name: "Maya Parent's profile" })).toBeVisible();
    await expect(adminHeat).toContainText("Parent of Ana");
    await expect(adminHeat).toContainText("+230 5555 0101");
    expect((await page.request.patch(`/api/admin/cup/heats/${heat.id}/volunteers`, post({ email: parentEmail, decision: "approved" }))).status()).toBe(403);
    await approval.click();
    await expect(page.getByText("You’re approved. Waiting for the organiser to start this heat.")).toBeVisible({ timeout: 10000 });
    const ana = page.getByRole("article", { name: "Ana, red rashie" });
    await expect(ana.getByRole("button", { name: "5 stars", exact: true })).toBeDisabled();
    expect((await page.request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, wave: 1, score: 5 }))).status()).toBe(409);
    await adminHeat.getByRole("button", { name: "Start heat", exact: true }).click();
    await expect(ana.getByRole("button", { name: "5 stars", exact: true })).toBeEnabled({ timeout: 10000 });
    await ana.getByRole("button", { name: "5 stars", exact: true }).click();
    await expect(ana.getByRole("button", { name: "W1 5 ★" })).toBeVisible();
    const rating = (await board(request)).waves.find((wave) => wave.kidId === ids.Ana)!;
    const started = (await board(request)).heats[0];
    expect(Date.parse(started.endsAt!) - Date.parse(started.startedAt!)).toBeGreaterThanOrEqual(119900);
    expect((await request.patch(`/api/admin/cup/heats/${heat.id}`, post({ durationMinutes: 20 }))).status()).toBe(409);
    await request.patch(`/api/admin/cup/heats/${heat.id}`, post({ status: "running" }));
    expect((await board(request)).heats[0].endsAt).toBe(started.endsAt);

    // Move the persisted server deadline to exercise each threshold in a real browser.
    await db.query("UPDATE cup_heat SET ends_at=clock_timestamp()+interval '59 seconds' WHERE id=$1", [heat.id]);
    await expect(page.getByRole("alert")).toContainText("1 minute remaining", { timeout: 10000 });
    await db.query("UPDATE cup_heat SET ends_at=clock_timestamp()+interval '29 seconds' WHERE id=$1", [heat.id]);
    await expect(page.getByRole("alert")).toContainText("30 seconds remaining", { timeout: 10000 });
    await page.screenshot({ path: "test-results/cup-volunteer-countdown-mobile.png", fullPage: true });
    // Losing the live connection must not leave score buttons active past the deadline.
    await page.route("**/api/cup/judge", (route) => route.abort());
    await page.clock.fastForward(31000);
    await expect(ana.getByRole("button", { name: "5 stars", exact: true })).toBeDisabled();
    await expect(page.getByRole("alert")).toContainText("Time is up. Scoring is closed.");
    await db.query("UPDATE cup_heat SET ends_at=clock_timestamp()-interval '1 second' WHERE id=$1", [heat.id]);
    await page.unroute("**/api/cup/judge");
    expect((await page.request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, wave: 2, score: 4 }))).status()).toBe(409);
    expect((await page.request.patch(`/api/cup/judge/waves/${rating.id}`, post({ score: 1 }))).status()).toBe(409);
    expect((await page.request.delete(`/api/cup/judge/waves/${rating.id}`, { headers: { origin } })).status()).toBe(409);
    await expect(page.getByRole("button", { name: "5 stars", exact: true }).filter({ visible: true })).toHaveCount(0, { timeout: 10000 });
    const finished = await board(request);
    expect(finished.heats[0].status).toBe("done");
    expect(finished.ticker.filter((item) => item.kind === "result")).toHaveLength(1);
    await Promise.all([guest.get("/api/cup/live"), request.get("/api/admin/cup"), page.request.get("/api/cup/judge")]);
    expect((await board(request)).ticker.filter((item) => item.kind === "result")).toHaveLength(1);
    expect((await guest.get("/api/cup/live")).status()).toBe(200);
    expect(JSON.stringify(await (await guest.get("/api/cup/live")).json())).not.toContain(parentEmail);

    // The next heat has no inherited approval, even for a previously approved judge.
    await request.patch(`/api/admin/cup/heats/${nextHeat.id}`, post({ status: "running" }));
    await page.getByRole("tab", { name: "R1·H2" }).click();
    await expect(page.getByRole("button", { name: "Volunteer to judge this heat" })).toBeVisible();
    expect((await page.request.post("/api/cup/judge/waves", post({ heatId: nextHeat.id, kidId: ids.Eli, score: 5 }))).status()).toBe(403);
    await page.getByRole("button", { name: "Volunteer to judge this heat" }).click();
    // Wait for the request to persist before the organiser reviews it.
    await expect(page.getByText("Waiting for organiser approval.", { exact: false })).toBeVisible();
    expect((await request.patch(`/api/admin/cup/heats/${nextHeat.id}/volunteers`, post({ email: parentEmail, decision: "declined" }))).status()).toBe(200);
    await expect(page.getByText("You have not been selected for this heat.")).toBeVisible({ timeout: 10000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await admin.screenshot({ path: "test-results/cup-volunteer-admin.png", fullPage: true });
  } finally { await adminContext.close(); await guest.dispose(); }
});

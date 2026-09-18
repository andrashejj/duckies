import { test, expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";
import { signIn, sendCode } from "./auth-helpers";
import { CUP_TERM } from "../src/lib/registration/cup";
import { drawRound, heatSizes, standings, type Entrant, type Heat } from "../src/lib/comp";

// Cup day: the draw, judging by email, the leaderboard and the public feed.
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329";
const organiser = "organiser@example.com";
const judgeEmail = "judge@example.com";
const post = (data: unknown) => ({ headers: { origin }, data });

// Ten kids born a year apart: the draw by age is easy to check.
const kids = ["Ana", "Ben", "Cleo", "Dev", "Eli", "Fay", "Gus", "Hana", "Ivo", "Jun"].map((name, index) => ({ name, dob: `${2019 - index}-03-01` }));
type Board = { config: { rounds: number; heatSize: number; finalSize: number; live: boolean; version: number }; entrants: Entrant[]; heats: Heat[]; waves: { id: string; heatId: string; kidId: string; judge: string; score: number }[]; judges: { email: string; name: string }[]; ticker: { kind: string; message: string }[]; standings: ReturnType<typeof standings> };

async function seedKids() {
  const ids: Record<string, string> = {};
  for (const kid of kids) {
    const { rows } = await db.query("INSERT INTO club_kid (name) VALUES ($1) RETURNING id", [kid.name]);
    ids[kid.name] = rows[0].id;
    await db.query("INSERT INTO club_cup_entry (kid_id, edition, member, contact_name, contact_phone) VALUES ($1,$2,true,'Parent','+230 5000 0000')", [rows[0].id, CUP_TERM]);
    const link = await db.query("INSERT INTO club_registration_link (kid_id, token_hash, term, expires_at, completed_at) VALUES ($1,$2,'2026-S2',now()+interval '1 day',now()) RETURNING id", [rows[0].id, `hash-${kid.name}`]);
    await db.query(
      `INSERT INTO club_signed_waiver (id,kid_id,link_id,term,signed_at,snapshot,canonical_payload,payload_sha256,pdf,pdf_sha256,seal,public_key)
      VALUES (gen_random_uuid(),$1,$2,'2026-S2',now(),$3,'{}','x','\\x00','x','x','x')`,
      [rows[0].id, link.rows[0].id, JSON.stringify({ registration: { childName: kid.name, dateOfBirth: kid.dob } })],
    );
  }
  return ids;
}
const board = async (request: APIRequestContext) => (await (await request.get("/api/admin/cup")).json()) as Board;
const heatsOf = (state: Board, round: number) => state.heats.filter((heat) => heat.stage === "round" && heat.round === round);

test.beforeEach(async () => {
  await db.query('TRUNCATE club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit,cup_heat,cup_judge,cup_ticker CASCADE');
  await db.query("INSERT INTO club_member(email,role) VALUES ($1,'organiser')", [organiser]);
  await db.query("INSERT INTO club_semester (id,label,starts_on,ends_on,child_fee_mur,family_fee_mur) VALUES ($1,'Sunset Duckies Cup Vol. 02','2026-10-16','2026-10-16',1000,1000) ON CONFLICT (id) DO NOTHING", [CUP_TERM]);
  await db.query("INSERT INTO cup_event (edition) VALUES ($1) ON CONFLICT (edition) DO UPDATE SET rounds=2, heat_size=4, final_size=4, live=false, version=1", [CUP_TERM]);
});
test.afterAll(async () => { await db.end(); });

test("the draw: even heats, round 1 by age, later rounds shuffled with everyone once per round", () => {
  expect(heatSizes(14, 4)).toEqual([4, 4, 3, 3]);
  expect(heatSizes(8, 4)).toEqual([4, 4]);
  expect(heatSizes(5, 4)).toEqual([3, 2]);
  expect(heatSizes(0, 4)).toEqual([]);
  const entrants: Entrant[] = kids.map((kid, index) => ({ id: `k${index}`, name: kid.name, age: 7 + index, member: true, photoVersion: null }));
  const first = drawRound(entrants, 1, 4, []);
  expect(first.map((heat) => heat.map((slot) => slot.kidId))).toEqual([["k0", "k1", "k2", "k3"], ["k4", "k5", "k6"], ["k7", "k8", "k9"]]);
  expect(first[0].map((slot) => slot.colour)).toEqual(["red", "yellow", "blue", "green"]);
  const previous: Heat[] = first.map((slots, index) => ({ id: `h${index}`, stage: "round", round: 1, number: index + 1, status: "done", startedAt: null, finishedAt: null, slots }));
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

  // Once a judge has scored a heat, that heat is not redrawn and the kid does not leave it.
  expect((await request.post("/api/cup/judge/waves", post({ heatId: h1.id, kidId: ids.Ana, score: 7 }))).status()).toBe(201);
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

test("judges are invited by email, sign in without membership, score only their own waves; best two average onto the board", async ({ request, playwright }) => {
  const ids = await seedKids();
  await signIn(request, organiser);
  let state = (await (await request.post("/api/admin/cup/rounds", post({ round: 1 }))).json()) as Board;
  const heat = heatsOf(state, 1)[0];

  const judge = await playwright.request.newContext({ baseURL: origin });
  const stranger = await playwright.request.newContext({ baseURL: origin });
  try {
    // Not invited: no code is sent, and the sheet is closed.
    expect(await sendCode(stranger, "nobody@example.com")).toBeUndefined();
    expect((await request.post("/api/admin/cup/judges", post({ email: "not an email", name: "X" }))).status()).toBe(400);
    const invited = await request.post("/api/admin/cup/judges", post({ email: "Judge@Example.com ", name: "Judy" }));
    expect(invited.status()).toBe(201);
    expect((await invited.json()).judges).toEqual([{ email: judgeEmail, name: "Judy" }]);
    await signIn(judge, judgeEmail);
    expect((await judge.get("/api/kids")).status()).toBe(401);
    expect((await judge.get("/api/admin/cup")).status()).toBe(403);
    const sheet = await (await judge.get("/api/cup/judge")).json();
    expect(sheet.judge).toEqual({ email: judgeEmail, name: "Judy", organiser: false });
    expect(sheet.heats).toHaveLength(3);
    expect(sheet.kids[ids.Ana]).toMatchObject({ name: "Ana", age: 7, photoVersion: null });
    expect(sheet.kids[ids.Ana].contactPhone).toBeUndefined();

    // Judy scores Ana 7, 5.5, 8 (best two 15.5) and Ben 4; the organiser scores Ana 6 + 6 (12) and nothing for Ben.
    const wave = async (context: APIRequestContext, kidId: string, score: number) => { const r = await context.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId, score })); expect(r.status()).toBe(201); return (await r.json()).wave; };
    const first = await wave(judge, ids.Ana, 7);
    await wave(judge, ids.Ana, 5.5);
    const third = await wave(judge, ids.Ana, 8);
    expect(third.wave).toBe(3);
    await wave(judge, ids.Ben, 4);
    expect((await judge.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Jun, score: 5 }))).status()).toBe(404);
    expect((await judge.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, score: 7.25 }))).status()).toBe(400);
    expect((await judge.post("/api/cup/judge/waves", { headers: { origin: "https://elsewhere.example" }, data: { heatId: heat.id, kidId: ids.Ana, score: 5 } })).status()).toBe(403);
    await wave(request, ids.Ana, 6);
    await wave(request, ids.Ana, 6);
    // Judy corrects her first wave down and cannot touch the organiser's.
    expect((await judge.patch(`/api/cup/judge/waves/${first.id}`, post({ score: 6.5 }))).status()).toBe(200);
    const organiserWave = ((await board(request)).waves).find((entry) => entry.judge === organiser)!;
    expect((await judge.patch(`/api/cup/judge/waves/${organiserWave.id}`, post({ score: 1 }))).status()).toBe(404);
    expect((await judge.delete(`/api/cup/judge/waves/${organiserWave.id}`, { headers: { origin } })).status()).toBe(404);
    expect((await (await judge.get("/api/cup/judge")).json()).waves).toHaveLength(4);

    state = await board(request);
    const ana = state.standings.find((row) => row.name === "Ana")!;
    expect(ana).toMatchObject({ rank: 1, rounds: [13.25, null], total: 13.25, heats: 1 }); // (8 + 6.5 + 12) / 2 judges
    expect(state.standings.find((row) => row.name === "Ben")).toMatchObject({ rank: 2, total: 2 });
    expect(state.standings.find((row) => row.name === "Cleo")).toMatchObject({ rank: 3, total: 0 });
    expect(state.standings.find((row) => row.name === "Jun")).toMatchObject({ rank: 3, total: 0 });

    // Uninvited again: the sheet closes on the next request even with a live session.
    expect((await request.delete(`/api/admin/cup/judges/${encodeURIComponent(judgeEmail)}`, { headers: { origin } })).status()).toBe(200);
    expect((await judge.get("/api/cup/judge")).status()).toBe(403);
    expect((await judge.get("/cup/judge")).status()).toBe(200);
    expect(await (await judge.get("/cup/judge")).text()).toContain("Judging needs an invitation");
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
    expect((await guest.get("/cup/judge", { maxRedirects: 0 })).status()).toBe(302);
    expect((await guest.get("/api/cup/judge")).status()).toBe(401);
    expect((await guest.get(`/api/cup/photo/${ids.Ana}`)).status()).toBe(401);
    expect((await guest.get("/api/admin/cup")).status()).toBe(401);

    expect((await request.patch(`/api/admin/cup/heats/${heat.id}`, post({ status: "running" }))).status()).toBe(200);
    await request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Dev, score: 9 }));
    await request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Dev, score: 3 }));
    await request.post("/api/cup/judge/waves", post({ heatId: heat.id, kidId: ids.Ana, score: 5 }));
    expect((await request.patch(`/api/admin/cup/heats/${heat.id}`, post({ status: "done" }))).status()).toBe(200);
    expect((await request.post("/api/admin/cup/ticker", post({ message: "BBQ is on 🔥" }))).status()).toBe(201);
    state = await board(request);
    expect(state.ticker.map((item) => item.kind)).toEqual(["note", "result", "heat"]);
    expect(state.ticker[2].message).toContain("Round 1 · Heat 1 is in the water — 🔴 Ana · 🟡 Ben · 🔵 Cleo · 🟢 Dev");
    expect(state.ticker[1].message).toBe("🏁 Round 1 · Heat 1 done — Dev 12 · Ana 5 · Ben 0 · Cleo 0");

    expect((await request.patch("/api/admin/cup", post({ live: true, version: state.config.version }))).status()).toBe(200);
    const live = await (await guest.get("/api/cup/live")).json();
    expect(live.live).toBe(true);
    expect(live.leaderboard[0]).toMatchObject({ rank: 1, name: "Dev", age: 10, total: 12, rounds: [12, null] });
    expect(live.leaderboard[0].kidId).toBeUndefined();
    expect(JSON.stringify(live)).not.toMatch(/photo|contact|phone|email/i);
    expect(live.ticker).toHaveLength(3);
    expect(live.running).toHaveLength(0);
    expect(live.upNext.map((entry: { label: string }) => entry.label)).toEqual(["Round 1 · Heat 2", "Round 1 · Heat 3"]);
    expect(live.heats[0].surfers).toEqual([
      { name: "Ana", colour: "red", score: 5 }, { name: "Ben", colour: "yellow", score: 0 }, { name: "Cleo", colour: "blue", score: 0 }, { name: "Dev", colour: "green", score: 12 },
    ]);
    // The page shell is static: the names only ever travel through the feed.
    const page = await guest.get("/sunset-duckies-cup-vol-2/live");
    expect(page.status()).toBe(200);
    expect(await page.text()).not.toMatch(/\bCleo\b/);

    // The final takes the top of the leaderboard as it stands.
    expect((await request.post("/api/admin/cup/final", post({}))).status()).toBe(201);
    state = await board(request);
    const final = state.heats.find((entry) => entry.stage === "final")!;
    expect(final.slots.map((slot) => state.entrants.find((kid) => kid.id === slot.kidId)!.name)).toEqual(["Dev", "Ana", "Ben", "Cleo"]);
    expect(final.slots.map((slot) => slot.colour)).toEqual(["red", "yellow", "blue", "green"]);
    await request.post("/api/cup/judge/waves", post({ heatId: final.id, kidId: ids.Ana, score: 10 }));
    expect((await request.post("/api/admin/cup/final", post({}))).status()).toBe(409);
    const after = await (await guest.get("/api/cup/live")).json();
    expect(after.final.surfers[0]).toEqual({ name: "Ana", colour: "yellow", score: 10 });
    expect(after.leaderboard.find((row: { name: string }) => row.name === "Ana")).toMatchObject({ total: 5, final: 10 });
  } finally { await guest.dispose(); }
});

test("the judge sheet and the live board render on a phone", async ({ page, playwright }) => {
  const ids = await seedKids();
  const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    await signIn(admin, organiser);
    await admin.post("/api/admin/cup/rounds", post({ round: 1 }));
    await admin.post("/api/admin/cup/judges", post({ email: judgeEmail, name: "Judy" }));
    const state = await board(admin);
    await admin.patch(`/api/admin/cup/heats/${heatsOf(state, 1)[1].id}`, post({ status: "running" }));
    await admin.patch("/api/admin/cup", post({ live: true, version: state.config.version }));
  } finally { await admin.dispose(); }
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page.request, judgeEmail);
  await page.goto("/cup/judge");
  await expect(page.getByRole("heading", { name: "Score the waves." })).toBeVisible();
  // Lands on the heat in the water (the first render waits for the dev server to build the island).
  await expect(page.getByRole("tab", { name: "R1·H2" })).toHaveAttribute("aria-selected", "true", { timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Round 1 · Heat 2" })).toBeVisible();
  const eli = page.getByRole("article", { name: "Eli, red rashie" });
  await eli.getByRole("button", { name: "7.5", exact: true }).click();
  await expect(eli.getByRole("button", { name: "W1 7.5" })).toBeVisible();
  await eli.getByRole("button", { name: "9", exact: true }).click();
  await expect(eli).toContainText("16.5");
  await eli.getByRole("button", { name: "W1 7.5" }).click();
  await eli.getByRole("button", { name: "8", exact: true }).click();
  await expect(eli.getByRole("button", { name: "W1 8" })).toBeVisible();
  await expect(eli).toContainText("17");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/cup-judge-mobile.png", fullPage: true });
  expect((await db.query("SELECT score::float AS score FROM cup_wave WHERE kid_id=$1 ORDER BY wave", [ids.Eli])).rows.map((row) => row.score)).toEqual([8, 9]);

  await page.goto("/sunset-duckies-cup-vol-2/live");
  await expect(page.getByText("● in the water now")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Round 1 · Heat 2" })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Eli");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/cup-live-mobile.png", fullPage: true });
});

test("the organiser board draws, drags a kid between heats, runs a heat and goes live", async ({ page }) => {
  await seedKids();
  await page.setViewportSize({ width: 1380, height: 900 });
  await signIn(page.request, organiser);
  await page.goto("/admin/cup");
  await expect(page.getByRole("heading", { name: "10 kids in the draw" })).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Draw round 1" }).click();
  await expect(page.getByText("Round 1 drawn.")).toBeVisible();
  const heat1 = page.getByRole("article").filter({ hasText: "Round 1 · Heat 1" });
  const heat3 = page.getByRole("article").filter({ hasText: "Round 1 · Heat 3" });
  await expect(heat1).toContainText("4/4");
  await expect(heat3).toContainText("3/4");
  // Drag Dev out of the full heat 1 into heat 3.
  await heat1.getByRole("listitem").filter({ hasText: "Dev" }).dragTo(heat3);
  await expect(heat1).toContainText("3/4");
  await expect(heat3).toContainText("4/4");
  await expect(heat3.getByRole("listitem").filter({ hasText: "Dev" })).toContainText("10 yrs");
  // Phones use the menu instead: send Ana to heat 2, give her the green rashie.
  await heat1.getByLabel("Move Ana").selectOption({ label: "→ R1·H2" });
  const heat2 = page.getByRole("article").filter({ hasText: "Round 1 · Heat 2" });
  await expect(heat2.getByRole("listitem").filter({ hasText: "Ana" })).toBeVisible();
  await expect(heat2).toContainText("4/4");
  await expect(heat2.getByLabel("Ana's rashie")).toHaveValue("green");
  await heat2.getByRole("button", { name: "Start heat" }).click();
  await expect(heat2).toContainText("in the water");
  await expect(page.getByRole("listitem").filter({ hasText: "Heat 2 is in the water" })).toBeVisible();
  await page.getByRole("button", { name: "Leaderboard is hidden" }).click();
  await expect(page.getByRole("button", { name: "Leaderboard is LIVE" })).toBeVisible();
  await page.screenshot({ path: "test-results/cup-admin-desktop.png", fullPage: true });
  expect((await db.query("SELECT live FROM cup_event WHERE edition=$1", [CUP_TERM])).rows[0].live).toBe(true);
});

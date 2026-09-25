import { test, expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";
import { signIn } from "./auth-helpers";
import { clubToday, type TrainingBoard } from "../src/lib/club-points";
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329", organiser = "andras@hejj.xyz", coach = "coach@example.com", trainer = "trainer@example.com", parent = "parent@example.com";
const today = clubToday();
const dayBefore = (date: string, days = 1) => new Date(new Date(`${date}T12:00:00Z`).getTime() - days * 86400000).toISOString().slice(0, 10);
const previous = dayBefore(today);
const post = (data: unknown) => ({ headers: { origin }, data });
let kids: Record<"alice" | "ben" | "cleo", string>, organiserRequest: APIRequestContext;
const makeCoach = (email = coach, name = "Cora Coach") => db.query("INSERT INTO club_coach(email,name,created_by) VALUES($1,$2,$3)", [email, name, organiser]);
const presentCount = async (date = today) => (await db.query("SELECT count(*)::int AS n FROM club_attendance WHERE present AND date=$1", [date])).rows[0].n;
const board = async (request: APIRequestContext, date = today): Promise<TrainingBoard> => (await request.get(`/api/training?date=${date}`)).json();
test.beforeEach(async ({ playwright }) => {
  await db.query('TRUNCATE club_member_archive,club_kid,club_member,club_parent_profile,club_coach,club_training,club_point_rule,"user","session",account,verification,"rateLimit",shop_request_limit CASCADE');
  await db.query("INSERT INTO club_point_rule(effective_at,training,granola,cup,recorded_by) VALUES('1970-01-01',10,5,20,'test')");
  await db.query("INSERT INTO club_member(email,role) VALUES($1,'organiser'),($2,'member'),($3,'member')", [organiser, parent, coach]);
  await db.query("INSERT INTO club_parent_profile(email,name,phone) VALUES($1,'Cora Coach','5550')", [coach]);
  const rows = (await db.query("INSERT INTO club_kid(name) VALUES('Alice Duckie'),('Ben Duckie'),('Cleo Duckie') RETURNING id,name")).rows;
  kids = Object.fromEntries(rows.map(row => [row.name.split(" ")[0].toLowerCase(), row.id])) as typeof kids;
  await db.query("INSERT INTO club_guardian_access(kid_id,email,name,relationship,phone,updated_by) VALUES($1,$2,'Alice Parent','Mother','5555',$3)", [kids.alice, parent, organiser]);
  organiserRequest = await playwright.request.newContext({ baseURL: origin }); await signIn(organiserRequest, organiser);
});
test.afterEach(async () => { await organiserRequest.dispose(); });
test.afterAll(async () => { await db.end(); });

test("organisers pick coaches; coaches call the roll, members only read it, and removal ends calling at once", async ({ playwright }) => {
  const coachRequest = await playwright.request.newContext({ baseURL: origin }); await signIn(coachRequest, coach);
  expect((await board(coachRequest)).access).toBe("member");
  expect((await coachRequest.patch("/api/training", post({ date: today, kidIds: [kids.alice], present: true }))).status()).toBe(403);
  expect((await coachRequest.post("/api/admin/coaches", post({ email: coach }))).status()).toBe(403);
  expect((await organiserRequest.post("/api/admin/coaches", { headers: { origin: "https://evil.example" }, data: { email: coach } })).status()).toBe(403);
  expect((await organiserRequest.post("/api/admin/coaches", post({ email: "not-an-email" }))).status()).toBe(400);
  const nameless = await organiserRequest.post("/api/admin/coaches", post({ email: "stranger@example.com" }));
  expect(nameless.status()).toBe(400);
  expect((await nameless.json()).error).toContain("Add the coach’s name");
  const added = await organiserRequest.post("/api/admin/coaches", post({ email: coach }));
  expect(added.status()).toBe(201);
  expect((await added.json()).coaches).toMatchObject([{ email: coach, name: "Cora Coach", addedBy: organiser, signedIn: true }]);

  const called = await board(coachRequest);
  expect(called).toMatchObject({ access: "coach", date: today, sessionPoints: 10 });
  expect(called.kids.map(kid => [kid.name, kid.guardians, kid.split])).toEqual([["Alice Duckie", "Alice Parent", null], ["Ben Duckie", "", null], ["Cleo Duckie", "", null]]);
  expect((await coachRequest.patch("/api/training", post({ date: today, kidIds: [kids.alice, kids.ben], present: true }))).status()).toBe(200);
  const after: TrainingBoard = await (await coachRequest.patch("/api/training", post({ date: today, kidIds: [kids.ben], present: false }))).json();
  expect(after.kids.map(kid => [kid.status, kid.trainings, kid.points])).toEqual([["here", 1, 10], ["away", 0, 0], [null, 0, 0]]);
  expect((await db.query("SELECT DISTINCT recorded_by FROM club_attendance_event")).rows).toEqual([{ recorded_by: coach }]);
  expect((await board(organiserRequest)).kids[0].split).toEqual({ training: 10, granola: 0, cup: 0 });
  expect((await coachRequest.put("/api/admin/point-rules", post({ training: 99, granola: 0, cup: 0 }))).status()).toBe(403);
  expect((await coachRequest.patch("/api/training", post({ date: "2099-01-01", kidIds: [kids.alice], present: true }))).status()).toBe(400);

  const removed = await organiserRequest.delete(`/api/admin/coaches/${encodeURIComponent(coach)}`, { headers: { origin } });
  expect(removed.status()).toBe(200); expect((await removed.json()).coaches).toEqual([]);
  // Still a club member: back to reading the roll, which keeps their marks.
  const reader = await board(coachRequest);
  expect(reader.access).toBe("member");
  expect(reader.kids.map(kid => kid.status)).toEqual(["here", "away", null]);
  expect((await coachRequest.patch("/api/training", post({ date: today, kidIds: [kids.cleo], present: true }))).status()).toBe(403);
  expect((await organiserRequest.delete(`/api/admin/coaches/${encodeURIComponent(coach)}`, { headers: { origin } })).status()).toBe(404);
  await coachRequest.dispose();
});

test("an outside trainer signs in straight to training; portraits follow who calls the roll", async ({ request, playwright }) => {
  const refused = await request.post("/api/auth/sign-in/email-otp", { headers: { origin }, data: { email: trainer, otp: "000000" } });
  expect(refused.status()).toBe(401);
  expect((await organiserRequest.post("/api/admin/coaches", post({ email: "Trainer@Example.com", name: "Tom Trainer" }))).status()).toBe(201);
  expect((await db.query("SELECT email,name FROM club_coach WHERE email=$1", [trainer])).rows).toEqual([{ email: trainer, name: "Tom Trainer" }]);
  await signIn(request, trainer);
  expect(await (await request.get("/api/session")).json()).toMatchObject({ signedIn: true, member: false, family: false, coach: true, home: "/members/training" });
  expect((await request.get("/members/training")).status()).toBe(200);
  expect((await request.get("/members")).status()).toBe(403);
  expect((await board(request)).access).toBe("coach");
  await db.query("INSERT INTO club_kid_photo(kid_id,image,source) VALUES($1,$2,'organiser'),($3,$2,'organiser')", [kids.alice, Buffer.from("RIFFtestWEBP"), kids.ben]);
  for (const id of [kids.alice, kids.ben]) expect((await request.get(`/api/training/photo/${id}`)).status()).toBe(200);
  expect((await request.get(`/api/training/photo/${kids.cleo}`)).status()).toBe(404);
  // The organiser photo route stays closed; coaches only reach the training one.
  expect([401, 403]).toContain((await request.get(`/api/kids/${kids.alice}/photo`)).status());
  const parentRequest = await playwright.request.newContext({ baseURL: origin });
  await db.query('TRUNCATE "rateLimit"');
  await signIn(parentRequest, parent);
  const member = await board(parentRequest);
  expect(member.kids.map(kid => [kid.name, kid.mine, !!kid.photoVersion])).toEqual([["Alice Duckie", true, true], ["Ben Duckie", false, false], ["Cleo Duckie", false, false]]);
  expect((await parentRequest.get(`/api/training/photo/${kids.alice}`)).status()).toBe(200);
  expect((await parentRequest.get(`/api/training/photo/${kids.ben}`)).status()).toBe(404);
  await parentRequest.dispose();
});

test("a coach calls the roll one by one on a phone and the leaderboard moves with it", async ({ page }) => {
  await makeCoach();
  await signIn(page.request, coach);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/members");
  const nav = page.getByRole("navigation", { name: "Mobile member navigation" });
  await nav.getByRole("link", { name: "Training", exact: true }).click();
  await expect(page).toHaveURL(/\/members\/training$/);
  await expect(nav.getByRole("link", { name: "Training", exact: true })).toHaveAttribute("aria-current", "page");
  const roll = page.getByRole("region", { name: "Roll call" });
  const leaderboard = page.getByRole("list", { name: "Club points leaderboard" });
  await expect(roll.getByRole("button", { name: /^Today/ })).toHaveAttribute("aria-pressed", "true");
  await expect(roll.getByText("1 of 3")).toBeVisible();
  await expect(roll.getByText("First training")).toBeVisible();
  await expect(page.getByRole("region", { name: "Coaches & trainers" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/training-phone.png", fullPage: true });
  await roll.getByRole("button", { name: "Here: Alice Duckie" }).click();
  await expect(roll.getByRole("status")).toContainText("Alice Duckie is here. +10 points.");
  await roll.getByRole("button", { name: "Away: Ben Duckie" }).click();
  await expect(roll.getByRole("button", { name: "Here: Cleo Duckie" })).toBeFocused();
  await page.keyboard.press("h");
  await expect(roll.getByRole("heading", { name: "That’s the whole crew." })).toBeVisible();
  await expect(roll.locator("[data-roll-count]")).toHaveText("2 here · 1 away · 0 to call");
  await expect(roll.locator("[data-points-given]")).toHaveText("+20 points");
  await expect(roll.getByRole("list", { name: "Here today" }).getByRole("listitem")).toHaveText(["✓ Alice Duckie", "✓ Cleo Duckie"]);
  await expect(leaderboard.getByRole("listitem")).toHaveText([/^Place 1A.*Alice Duckie.*10pts$/, /^Place 1C.*Cleo Duckie.*10pts$/, /^Place 3B.*Ben Duckie.*0pts$/]);
  await expect(roll).toHaveAttribute("data-saving", "false");
  expect(await presentCount()).toBe(2);
  await page.screenshot({ path: "test-results/training-done.png", fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await roll.getByRole("button", { name: "Walk the roll again" }).click();
  await expect(roll.getByRole("button", { name: "Here: Alice Duckie" })).toHaveAttribute("aria-pressed", "true");
  await roll.getByRole("button", { name: "Skip →" }).click();
  await expect(roll.getByRole("button", { name: "Away: Ben Duckie" })).toHaveAttribute("aria-pressed", "true");

  await roll.getByRole("button", { name: "Whole crew", exact: true }).click();
  const ben = roll.getByRole("button", { name: "Ben Duckie", exact: true });
  await expect(ben).toHaveAttribute("aria-pressed", "false"); await ben.click();
  await expect(roll.locator("[data-roll-count]")).toHaveText("3 here · 0 away · 0 to call");
  await expect(roll).toHaveAttribute("data-saving", "false");
  await page.reload();
  await expect(roll.getByRole("button", { name: "Whole crew", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(roll.getByRole("button", { name: "Ben Duckie", exact: true })).toHaveAttribute("aria-pressed", "true");
  await roll.getByLabel("Find a duckie").fill("Alice Parent");
  await expect(roll.getByRole("listitem").getByRole("button")).toHaveCount(1);
});

test("whole-crew taps queue up without losing a mark, the rest go away together and a failed save rolls back", async ({ page }) => {
  await makeCoach();
  await signIn(page.request, coach);
  await page.goto(`/coach?date=${previous}`);
  await expect(page).toHaveURL(new RegExp(`/members/training\\?date=${previous}$`));
  const roll = page.getByRole("region", { name: "Roll call" });
  await expect(roll.getByLabel("Training date", { exact: true })).toHaveValue(previous);
  // Slow saves: taps land while earlier ones are still on their way.
  await page.route("**/api/training", async route => { if (route.request().method() === "PATCH") await new Promise(done => setTimeout(done, 400)); await route.continue(); });
  for (const name of ["Alice Duckie", "Ben Duckie", "Cleo Duckie"]) await roll.getByRole("button", { name: `Here: ${name}` }).click();
  await expect(roll.getByRole("heading", { name: "That’s the whole crew." })).toBeVisible();
  await expect(roll).toHaveAttribute("data-saving", "false");
  await page.unroute("**/api/training");
  expect(await presentCount(previous)).toBe(3);

  await roll.getByRole("button", { name: /^Today/ }).click();
  await expect(roll.locator("[data-roll-count]")).toHaveText("0 here · 0 away · 3 to call");
  await roll.getByRole("button", { name: "Whole crew", exact: true }).click();
  await roll.getByRole("button", { name: "Alice Duckie", exact: true }).click();
  await roll.getByRole("button", { name: "Mark the 2 still to call as away" }).click();
  await expect(roll.getByRole("status")).toContainText("2 duckies marked away.");
  await expect(roll.locator("[data-roll-count]")).toHaveText("1 here · 2 away · 0 to call");
  await expect(roll).toHaveAttribute("data-saving", "false");
  expect((await db.query("SELECT present,count(*)::int AS n FROM club_attendance WHERE date=$1 GROUP BY present ORDER BY present", [today])).rows).toEqual([{ present: false, n: 2 }, { present: true, n: 1 }]);
  // Back to one by one, the closed roll opens on its summary.
  await roll.getByRole("button", { name: "One by one", exact: true }).click();
  await expect(roll.getByRole("heading", { name: "That’s the whole crew." })).toBeVisible();
  await roll.getByRole("button", { name: "Check the whole crew" }).click();

  await page.route("**/api/training", route => route.request().method() === "PATCH" ? route.fulfill({ status: 503, json: { error: "Test service unavailable" } }) : route.continue());
  await roll.getByRole("button", { name: "Ben Duckie", exact: true }).click();
  await expect(roll.getByRole("alert")).toContainText("Test service unavailable Ben Duckie is back as before.");
  await expect(roll.getByRole("button", { name: "Ben Duckie", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(roll.locator("[data-roll-count]")).toHaveText("1 here · 2 away · 0 to call");
});

test("members see who was in the water and the leaderboard, with their own duckies always on it", async ({ page }) => {
  const more = (await db.query("INSERT INTO club_kid(name) SELECT 'Crew '||lpad(n::text,2,'0') FROM generate_series(1,10) n RETURNING id")).rows.map(row => row.id);
  // Ten crew members with 20 points, Cleo with 10, Alice (the parent's) and Ben with none.
  for (const [date, ids] of [[previous, [...more, kids.cleo]], [dayBefore(today, 2), more]] as const) {
    await db.query("INSERT INTO club_training(date,points,created_by) VALUES($1,10,'test')", [date]);
    await db.query("INSERT INTO club_attendance(date,kid_id,present,updated_by) SELECT $1,unnest($2::uuid[]),true,'test'", [date, ids]);
  }
  await page.goto("/members/training");
  await expect(page).toHaveURL(/\/login\?next=%2Fmembers%2Ftraining$/);
  await expect(page.getByText("Training · Roll call & leaderboard")).toBeVisible();
  await signIn(page.request, parent);
  await page.goto(`/members/training?date=${previous}`);
  const roll = page.getByRole("region", { name: "Roll call" });
  await expect(roll.locator("[data-roll-count]")).toHaveText("11 in the water");
  await expect(roll.getByRole("button", { name: /^Here:/ })).toHaveCount(0);
  await expect(roll.getByRole("button", { name: "Whole crew", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Coaches & trainers" })).toHaveCount(0);
  await roll.getByRole("button", { name: /^Today/ }).click();
  await expect(roll.getByText("The roll hasn’t been called yet today.")).toBeVisible();
  const leaderboard = page.getByRole("list", { name: "Club points leaderboard" });
  const rows = leaderboard.getByRole("listitem");
  await expect(rows).toHaveCount(11);
  await expect(rows.first()).toContainText("Place 1");
  await expect(rows.nth(9)).toContainText("Place 1");
  await expect(rows.nth(10)).toContainText("Alice Duckie");
  await expect(rows.nth(10)).toContainText("yours");
  await expect(rows.nth(10)).toContainText("Place 12");
  await expect(rows.filter({ hasText: "Ben Duckie" })).toHaveCount(0);
  await page.getByRole("button", { name: "Show all 13 duckies" }).click();
  await expect(rows).toHaveCount(13);
  await expect(rows.nth(10)).toContainText("Cleo Duckie");
  await expect(rows.nth(10)).toContainText("Place 11");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: "test-results/training-member.png", fullPage: true });
});

test("organisers pick coaches and see point values on the club training page", async ({ page }) => {
  await page.context().addCookies((await organiserRequest.storageState()).cookies);
  await page.goto("/members/training");
  const panel = page.getByRole("region", { name: "Coaches & trainers" });
  await expect(panel.getByText("No coaches yet.")).toBeVisible();
  await panel.getByLabel("Parent or volunteer").selectOption({ label: "Cora Coach · coach@example.com" });
  await panel.getByRole("button", { name: "Add coach" }).click();
  await expect(panel.getByRole("status")).toHaveText("Cora Coach can now call the roll.");
  await expect(panel.getByRole("listitem").filter({ hasText: coach })).toContainText("not signed in yet");
  await expect(panel.getByLabel("Parent or volunteer").locator("option", { hasText: "Cora Coach" })).toHaveCount(0);
  await panel.getByText("Someone from outside the club?").click();
  await panel.getByLabel("Email", { exact: true }).fill("Trainer@Example.com");
  await panel.getByLabel("Name", { exact: true }).fill("Tom Trainer");
  await panel.getByRole("button", { name: "Add trainer" }).click();
  await expect(panel.getByRole("status")).toHaveText("Tom Trainer can now call the roll.");
  await expect(panel.getByRole("listitem")).toHaveCount(2);
  await panel.getByRole("button", { name: "Remove Cora Coach" }).click();
  await expect(panel.getByRole("status")).toHaveText("Cora Coach can no longer call the roll. The attendance they recorded stays.");
  expect((await db.query("SELECT email FROM club_coach")).rows).toEqual([{ email: trainer }]);

  const values = page.getByRole("region", { name: "Point values" });
  await expect(values.getByLabel("Training attended")).toHaveValue("10");
  await values.getByLabel("Training attended").fill("15");
  await values.getByRole("button", { name: "Save point values" }).click();
  await expect(values.getByRole("status")).toContainText("Saved.");
  await expect(page.getByRole("region", { name: "Roll call" }).getByRole("button", { name: "Here: Alice Duckie" })).toContainText("+15 points");
  await page.screenshot({ path: "test-results/training-organiser.png", fullPage: true });
});

import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import pg from "pg";

import { codeFor, sendCode, signIn } from "./auth-helpers";

const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const organiser = "organiser@example.com";
const member = "parent@example.com";
const origin = "http://127.0.0.1:4329";


test.beforeEach(async () => {
  await db.query('TRUNCATE club_member_archive,club_kid, club_member, "user", "session", account, verification, "rateLimit" CASCADE');
  await db.query("INSERT INTO club_member (email, role) VALUES ($1, 'organiser'), ($2, 'member')", [organiser, member]);
});
test.afterAll(async () => { await db.end(); });

test("anonymous and forged sessions cannot read or change the roster", async ({ request, page }) => {
  const anonymousHeaders: Record<string, string>[] = [{}, { cookie: "duckies.session_token=fake" }];
  for (const headers of anonymousHeaders) {
    const response = await request.get("/api/kids", { headers });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["cdn-cache-control"]).toBe("no-store");
    expect(response.headers()["vary"]).toContain("Cookie");
    expect(await response.text()).not.toContain('"kids"');
  }
  expect((await request.post("/api/kids", { data: { name: "Hidden" }, headers: { origin } })).status()).toBe(401);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-members]")).toBeHidden();
  await expect(page.getByRole("link", { name: "Club · sign in" }).first()).toBeVisible();
});

test("unapproved addresses receive no code and cannot register", async ({ request }) => {
  const email = "outsider@example.com";
  const result = await request.post("/api/auth/email-otp/send-verification-otp", { data: { email, type: "sign-in" }, headers: { origin } });
  expect(result.status()).toBe(200);
  const mail = await readFile(process.env.DUCKIES_TEST_MAIL_FILE!, "utf8").catch(() => "");
  expect(mail).not.toContain(email);
  expect((await request.post("/api/auth/sign-in/email-otp", { data: { email, otp: "123456" }, headers: { origin } })).status()).toBe(401);
  expect((await request.post("/api/auth/sign-up/email", { data: { email, password: "not-a-valid-signup", name: "Stranger" }, headers: { origin } })).ok()).toBe(false);
  expect((await db.query('SELECT id FROM "user" WHERE email = $1', [email])).rowCount).toBe(0);
});

test("members can read but cannot edit, even with a forged role", async ({ request, playwright }) => {
  const admin = await playwright.request.newContext({ baseURL: origin });
  await signIn(admin, organiser);
  const created = await admin.post("/api/kids", { data: { name: "Private Duckie" }, headers: { origin } });
  const { kid } = await created.json();
  await signIn(request, member);
  const response = await request.get("/api/kids");
  expect(response.status()).toBe(200);
  expect((await response.json()).kids).toEqual([kid]);
  for (const method of ["POST", "PATCH", "DELETE"]) {
    const response = await request.fetch(method === "POST" ? "/api/kids" : `/api/kids/${kid.id}`, {
      method, data: { name: "Changed", role: "organiser" }, headers: { origin, "x-role": "organiser" },
    });
    expect(response.status()).toBe(403);
  }
  await admin.dispose();
});

test("organiser CRUD persists, validates input, and rejects cross-origin writes", async ({ request }) => {
  const login = await signIn(request, organiser);
  expect(login.headers()["set-cookie"]).toContain("HttpOnly");
  expect(login.headers()["set-cookie"]).toContain("SameSite=Lax");
  for (const name of ["", " ", "a".repeat(81), 99, "bad\u0000name"]) {
    expect((await request.post("/api/kids", { data: { name }, headers: { origin } })).status()).toBe(400);
  }
  expect((await request.post("/api/kids", { data: { name: "Nope" }, headers: { origin: "https://outside.example" } })).status()).toBe(403);
  expect((await request.post("/api/kids", { data: { name: "Nope" } })).status()).toBe(403);
  const added = await request.post("/api/kids", { data: { name: "  Zoë   M. " }, headers: { origin } });
  expect(added.status()).toBe(201);
  const { kid } = await added.json();
  expect(kid.name).toBe("Zoë M.");
  expect((await db.query("SELECT name FROM club_kid WHERE id = $1", [kid.id])).rows[0].name).toBe("Zoë M.");
  expect((await request.patch(`/api/kids/${kid.id}`, { data: { name: "Zoë" }, headers: { origin } })).status()).toBe(200);
  expect((await request.delete(`/api/kids/${kid.id}`, { headers: { origin } })).status()).toBe(200);
  expect((await request.get("/api/kids")).ok()).toBe(true);
  expect((await db.query("SELECT * FROM club_kid WHERE archived_at IS NULL")).rowCount).toBe(0);
});

test("revoked membership and expired sessions immediately lose access", async ({ request }) => {
  await signIn(request, member);
  await db.query("DELETE FROM club_member WHERE email = $1", [member]);
  expect((await request.get("/api/kids")).status()).toBe(401);
  await db.query("INSERT INTO club_member (email) VALUES ($1)", [member]);
  await db.query('UPDATE "session" SET "expiresAt" = now() - interval \'1 hour\'');
  expect((await request.get("/api/kids")).status()).toBe(401);
});

test("OTP codes expire, have limited attempts, and cannot be replayed", async ({ request }) => {
  let otp = await sendCode(request, member);
  await db.query('UPDATE verification SET "expiresAt" = now() - interval \'1 hour\'');
  expect((await request.post("/api/auth/sign-in/email-otp", { data: { email: member, otp }, headers: { origin } })).ok()).toBe(false);
  await db.query('TRUNCATE "rateLimit"');
  otp = await sendCode(request, member);
  const wrong = otp === "000000" ? "111111" : "000000";
  for (let attempt = 0; attempt < 3; attempt++) {
    expect((await request.post("/api/auth/sign-in/email-otp", { data: { email: member, otp: wrong }, headers: { origin } })).ok()).toBe(false);
  }
  expect((await request.post("/api/auth/sign-in/email-otp", { data: { email: member, otp }, headers: { origin } })).ok()).toBe(false);
  await db.query('TRUNCATE "rateLimit"');
  otp = await sendCode(request, member);
  expect((await request.post("/api/auth/sign-in/email-otp", { data: { email: member, otp }, headers: { origin } })).status()).toBe(200);
  expect((await request.post("/api/auth/sign-in/email-otp", { data: { email: member, otp }, headers: { origin } })).ok()).toBe(false);
  const stored = await db.query("SELECT value FROM verification");
  expect(JSON.stringify(stored.rows)).not.toContain(otp);
});

test("email-code requests are rate limited", async ({ request }) => {
  const statuses: number[] = [];
  for (let index = 0; index < 5; index++) {
    const response = await request.post("/api/auth/email-otp/send-verification-otp", { data: { email: member, type: "sign-in" }, headers: { origin, "x-forwarded-for": `1.1.1.${index}` } });
    statuses.push(response.status());
  }
  expect(statuses).toContain(429);
});

test("mobile organiser can sign in, add, edit, remove, and sign out", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Your email address").fill(organiser);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByLabel("Your six-digit code")).toBeVisible();
  await page.getByLabel("Your six-digit code").fill(await codeFor(organiser));
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page.locator("[data-members]")).toBeVisible();
  await expect(page.locator("[data-empty]")).toBeVisible();
  const unsafeName = '<img src=x onerror="alert(1)">';
  await page.locator("[data-add-panel] > summary").click();
  await page.getByLabel("Add a duckie", { exact: true }).fill(unsafeName);
  await page.getByRole("button", { name: "Add to the lineup" }).click();
  await expect(page.locator(".duckie-name")).toHaveText(unsafeName);
  expect(await page.locator("[data-roster] img").count()).toBe(0);
  await page.locator(".duckie-summary").click();
  await page.getByRole("button", { name: `Edit ${unsafeName}`, exact: true }).click();
  await page.getByLabel("Name at the club", { exact: true }).fill("Test Duckie");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".duckie-name")).toHaveText("Test Duckie");
  await page.locator("[data-members]").screenshot({ path: "test-results/members-mobile.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Remove Test Duckie", exact: true }).click();
  await expect(page.locator("[data-empty]")).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("[data-members]")).toBeHidden();
  expect((await page.request.get("/api/kids")).status()).toBe(401);
  await page.goBack();
  await expect(page.locator("[data-members]")).toBeHidden();
  expect(errors).toEqual([]);
});

test("public HTML never embeds roster names; read-only members have no editor", async ({ request, page }) => {
  await signIn(request, organiser);
  await request.post("/api/kids", { data: { name: "ServerOnlyTestDuckie" }, headers: { origin } });
  const html = await request.get("/");
  expect(await html.text()).not.toContain("ServerOnlyTestDuckie");
  await signIn(page.request, member);
  await page.goto("/members/lineup", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "ServerOnlyTestDuckie" })).toBeVisible();
  await expect(page.locator("[data-add-kid]")).toBeHidden();
  expect(await page.locator(".duckie-actions").count()).toBe(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("region", { name: "Club members" }).screenshot({ path: "test-results/members-desktop.png" });
  await db.query("DELETE FROM club_member WHERE email = $1", [member]);
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(page).toHaveURL(/\/(login|account|members\/me)/);
  await expect(page.getByRole("heading", { name: "ServerOnlyTestDuckie" })).toHaveCount(0);
});

test("30-kid roster stays compact, filters contacts and keeps open drafts", async ({ page }) => {
  await signIn(page.request, organiser);
  const roster = await (await page.request.get("/api/kids")).json();
  // Browser-only sample lineup; never add demonstration children to the club database.
  roster.kids = Array.from({ length: 30 }, (_, index) => ({
    id: `sample-${index}`, name: `Sample Duckie ${String(index + 1).padStart(2, "0")}`,
    age: index < 15 ? 8 : null, photoVersion: null, contactName: `Contact ${index + 1}`, contactPhone: `555${index}`,
    registration: index < 15 ? {
      dateOfBirth: "2018-01-01", guardians: [{ name: `Guardian ${index + 1}`, relationship: "Parent", phone: `123${index}`, email: "sample@example.com" }],
      emergencyName: "Emergency contact", emergencyRelationship: "Parent", emergencyPhone: "999999",
      media: index < 10 ? "yes" : "no", parentInWater: true, signerName: "Sample Parent", medicalNotes: "", rashieSize: "S", rashieName: "Sample", membership: "child",
    } : null,
    familyGuardians: index < 15 ? [{ name: `Guardian ${index + 1}`, relationship: "Parent", phone: `123${index}`, email: "sample@example.com" }] : [],
    waiverId: index < 15 ? `waiver-${index}` : null, signedAt: index < 15 ? "2026-09-01" : null,
    payment: index < 20 ? { status: "paid", amountMur: 3000, note: "Sample", recordedAt: "2026-09-01" } : null, link: null,
  }));
  await page.route(/\/api\/kids(?:\?.*)?$/, route => route.fulfill({ json: roster }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#our-duckies", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".duckie-row")).toHaveCount(30);
  await expect(page.locator(".duckie-profile[open]")).toHaveCount(0);
  expect((await page.locator(".duckie-row").first().boundingBox())!.height).toBeLessThan(85);
  await page.locator("[data-members]").screenshot({ path: "test-results/roster-30-desktop.png" });
  const filter = page.getByLabel("Show", { exact: true });
  for (const [value, count] of [["unpaid", 10], ["unsigned", 15], ["no-media", 20], ["water", 15]] as const) {
    await filter.selectOption(value);
    await expect(page.locator(".duckie-row:visible")).toHaveCount(count);
    await expect(page.locator("[data-roster-count]")).toContainText(`${count} of 30`);
  }
  await filter.selectOption("all");
  await page.getByLabel("Search the lineup").fill("Guardian 2");
  await expect(page.locator(".duckie-row:visible")).toHaveCount(1);
  const summary = page.locator(".duckie-row:visible > details > summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".duckie-profile[open]")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit Sample Duckie 02", exact: true }).click();
  await page.locator(".duckie-profile[open]").getByLabel("Name at the club", { exact: true }).fill("Unsaved draft");
  await page.getByLabel("Search the lineup").fill("no such kid");
  await expect(page.locator("[data-no-matches]")).toBeVisible();
  await page.getByLabel("Search the lineup").fill("5551");
  await expect(page.locator(".duckie-profile[open]").getByLabel("Name at the club", { exact: true })).toHaveValue("Unsaved draft");
  await expect(page.locator(".duckie-profile[open]")).toHaveCount(1);
  await page.getByLabel("Search the lineup").fill("");
  await page.locator(".duckie-profile[open] > summary").click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator("[data-roster]").evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.screenshot({ path: "test-results/roster-30-mobile.png" });
  await page.locator(".duckie-summary").first().click();
  await expect(page.getByRole("button", { name: "Generate registration link" }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

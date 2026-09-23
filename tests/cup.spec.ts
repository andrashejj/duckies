import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from "@playwright/test";
import pg from "pg";
import { signIn } from "./auth-helpers";
import { submission, stageProfilePhoto } from "./registration-helpers";
import { WAIVER_VERSION } from "../src/lib/registration/policy";
import { CUP_TERM } from "../src/lib/registration/cup";
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329";
const owner = "andras@hejj.xyz";
const organiser = "organiser@example.com";
const guardian = "guardian@example.com";
const guardianPhone = "+230 5555 1234";
function payload(childName = "Zoë Test Surfer", email = guardian) {
  return {
    version: WAIVER_VERSION, childName, dateOfBirth: "2017-10-01",
    guardians: [{ name: "Test Guardian", relationship: "Father", phone: guardianPhone, email }],
    emergencyName: "Emergency Person", emergencyRelationship: "Aunt", emergencyPhone: "+230 5555 9999",
    medicalNotes: "", sessionsPerWeek: "2", media: "yes", parentInWater: true, swimming: true, reef: true, gear: true,
    waiverAccepted: true, electronicConsent: true, signerName: "Test Guardian", signature: [],
  };
}
const linkHeaders = (url: string) => ({ origin, authorization: `Bearer ${new URLSearchParams(new URL(url).hash.slice(1)).get("token")!}` });
const post = (data: Record<string, unknown>) => ({ headers: { origin }, data });
let guest: APIRequestContext;
// A kid the organiser added whose guardian signed the semester registration —
// a club family, paid or not.
async function registeredKid(request: APIRequestContext, name = "Zoë T.", email = guardian) {
  const kidId = (await (await request.post("/api/kids", post({ name }))).json()).kid.id as string;
  const link = await (await request.post(`/api/kids/${kidId}/link`, { headers: { origin } })).json();
  await stageProfilePhoto(guest, linkHeaders(link.url));
  expect((await guest.post("/api/registration", { headers: linkHeaders(link.url), data: submission(payload(undefined, email)) })).status()).toBe(201);
  return kidId;
}
async function pay(playwright: PlaywrightWorkerArgs["playwright"], kidId: string, term = "2026-S2") {
  const andras = await playwright.request.newContext({ baseURL: origin });
  await signIn(andras, owner);
  expect((await andras.post(`/api/kids/${kidId}/payment`, post({ term, status: "paid", amountMur: null, note: "Cash" }))).status()).toBe(201);
  await andras.dispose();
}
test.beforeEach(async ({ playwright }) => {
  await db.query('TRUNCATE club_member_archive,club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit CASCADE');
  await db.query("INSERT INTO club_member(email,role) VALUES ($1,'organiser'),($2,'organiser'),('member@example.com','member')", [owner, organiser]);
  // The semesters suite truncates club_semester; put the migration's cup term back the way it seeds it.
  await db.query(
    "INSERT INTO club_semester (id,label,starts_on,ends_on,child_fee_mur,family_fee_mur) VALUES ($1,'Sunset Duckies Cup Vol. 02','2026-10-16','2026-10-16',1000,1000) ON CONFLICT (id) DO NOTHING",
    [CUP_TERM],
  );
  guest = await playwright.request.newContext({ baseURL: origin });
});
test.afterEach(async () => { await guest.dispose(); });
test.afterAll(async () => { await db.end(); });

for (const [type, title, cupOnly, cupIncluded] of [
  ["club", "Club membership", false, false],
  ["cup", "Cup entry only", true, false],
  ["both", "Club membership + Cup", false, true],
] as const) {
  test(`shared registration starts blank and opens the ${type} form`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    const start = page.locator("#registration-start");
    await expect(start).toBeVisible();
    await expect(start.locator("input:checked")).toHaveCount(0);
    for (const name of ["kidName", "contactName", "contactPhone"])
      await expect(start.locator(`[name="${name}"]`)).toHaveValue("");
    await start.locator(`[value="${type}"]`).check();
    await start.getByLabel("First child’s name").fill("Shared Link Surfer");
    await start.getByLabel("Parent / guardian").fill("Shared Link Parent");
    await start.getByLabel("WhatsApp number").fill("+230 5999 8877");
    await start.getByRole("button", { name: "Continue to family details" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(start).toBeHidden();
    await expect(page.locator("#registration-form")).toBeVisible();
    await expect(page.locator("#registration-scope")).toContainText(cupOnly ? "Cup only" : cupIncluded ? "membership and your Cup entry" : "register separately");
    await expect(page.locator("#cup-covers")).toBeVisible({ visible: cupOnly });
    await expect(page.locator("#membership-covers")).toBeVisible({ visible: !cupOnly });
    await expect(page.locator("#cup-included")).toBeVisible({ visible: cupIncluded });
    await expect(page.getByLabel("Training rhythm", { exact: true })).toBeVisible({ visible: !cupOnly });
    await expect(page.locator("#submit-registration")).toContainText(cupOnly ? "Cup entry" : "club membership");
    const info = await (await guest.get("/api/registration", { headers: linkHeaders(page.url()) })).json();
    expect(info).toMatchObject({ cup: cupOnly, cupIncluded, term: cupOnly ? CUP_TERM : "2026-S2" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Sharing the bare link again must not carry over the previous family's details.
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await expect(start).toBeVisible();
    for (const name of ["kidName", "contactName", "contactPhone"])
      await expect(start.locator(`[name="${name}"]`)).toHaveValue("");
  });
}

test("the cup term is a regular term with the entry fee, never the current semester", async ({ request }) => {
  const { rows } = await db.query("SELECT label, child_fee_mur::float AS fee, is_current, starts_on::text AS starts FROM club_semester WHERE id=$1", [CUP_TERM]);
  expect(rows[0]).toMatchObject({ label: "Sunset Duckies Cup Vol. 02", fee: 1000, is_current: false, starts: "2026-10-16" });
  await signIn(request, organiser);
  const roster = await (await request.get("/api/kids")).json();
  expect(roster.term.id).toBe("2026-S2");
  expect(roster.semesters.find((s: { id: string }) => s.id === CUP_TERM)).toMatchObject({ childFeeMur: 1000, isCurrent: false });
});

test("anyone joins the club as pending: a self-issued link, the signed form, and payment left to Andras", async ({ request, playwright }) => {
  const entry = { kidName: "Noa New", contactName: "Parent New", contactPhone: "+230 5900 3344" };
  expect((await guest.post("/api/club/join", { data: entry })).status()).toBe(403);
  const result = await guest.post("/api/club/join", post(entry));
  expect(result.status()).toBe(201);
  const data = await result.json();
  expect(data.status).toBe("form");
  const info = await (await guest.get("/api/registration", { headers: linkHeaders(data.url) })).json();
  expect(info).toMatchObject({ cup: false, paid: false, term: "2026-S2", childName: "Noa New", childFeeMur: 3000, familyFeeMur: 5000 });
  await stageProfilePhoto(guest, linkHeaders(data.url));
  expect((await guest.post("/api/registration", { headers: linkHeaders(data.url), data: submission(payload("Noa New")) })).status()).toBe(201);
  expect((await (await guest.post("/api/club/join", post(entry))).json()).status).toBe("signed");
  expect((await db.query("SELECT count(*)::int AS n FROM club_kid")).rows[0].n).toBe(1);
  await signIn(request, organiser);
  let kid = (await (await request.get("/api/kids")).json()).kids[0];
  expect(kid).toMatchObject({ name: "Noa New", payment: null, memberPaid: false, approvedGuardians: [] });
  expect(kid.waiverId).toBeTruthy();
  // Only Andras confirms the payment; that is what makes the kid a member.
  expect((await request.post(`/api/kids/${kid.id}/payment`, post({ term: "2026-S2", status: "paid", amountMur: 3000, note: "Cash" }))).status()).toBe(403);
  await pay(playwright, kid.id);
  kid = (await (await request.get("/api/kids")).json()).kids[0];
  expect(kid.memberPaid).toBe(true);
});

test("sign-ups are rate limited per address", async () => {
  const bad = { kidName: "Spam", contactName: "Spam", contactPhone: "nope" };
  for (let i = 0; i < 8; i++) expect((await guest.post("/api/club/join", post(bad))).status()).toBe(400);
  expect((await guest.post("/api/cup/register", post(bad))).status()).toBe(429);
  expect((await db.query("SELECT count(*)::int AS n FROM club_kid")).rows[0].n).toBe(0);
});

test("a cup-only kid gets a private link, signs the club form without a training rhythm and shows up flagged", async ({ request }) => {
  const entry = { kidName: "Mila Test", contactName: "Parent Test", contactPhone: "+230 5900 1122" };
  expect((await guest.post("/api/cup/register", { data: entry })).status()).toBe(403);
  expect((await guest.post("/api/cup/register", post({ ...entry, contactPhone: "nope" }))).status()).toBe(400);
  const result = await guest.post("/api/cup/register", post(entry));
  expect(result.status()).toBe(201);
  const data = await result.json();
  expect(data.status).toBe("form");
  const headers = linkHeaders(data.url);
  const info = await (await guest.get("/api/registration", { headers })).json();
  expect(info).toMatchObject({ cup: true, term: CUP_TERM, termLabel: "Sunset Duckies Cup Vol. 02", childName: "Mila Test" });
  // A second submit before signing re-issues the link instead of adding a kid; the first link is gone.
  const again = await (await guest.post("/api/cup/register", post(entry))).json();
  expect(again.status).toBe("form");
  expect((await guest.get("/api/registration", { headers })).status()).toBe(404);
  const { sessionsPerWeek, ...noRhythm } = payload("Mila Test");
  await stageProfilePhoto(guest, linkHeaders(again.url));
  expect((await guest.post("/api/registration", { headers: linkHeaders(again.url), data: submission(noRhythm) })).status()).toBe(201);
  expect((await (await guest.post("/api/cup/register", post(entry))).json()).status).toBe("signed");
  expect((await db.query("SELECT count(*)::int AS n FROM club_kid")).rows[0].n).toBe(1);
  const record = (await db.query("SELECT snapshot FROM club_signed_waiver")).rows[0].snapshot;
  expect(record.term).toBe(CUP_TERM);
  expect(record.registration.sessionsPerWeek).toBeUndefined();
  await signIn(request, organiser);
  const roster = await (await request.get(`/api/kids?term=${CUP_TERM}`)).json();
  expect(roster.termLabel).toBe("Sunset Duckies Cup Vol. 02");
  expect(roster.kids[0]).toMatchObject({ name: "Mila Test", cup: { edition: CUP_TERM, member: false, contactName: "Parent Test", contactPhone: "+230 5900 1122" }, payment: null, memberPaid: false });
  expect(roster.kids[0].waiverId).toBeTruthy();
});

test("a new family can join the club from the Cup page: on the cup list, and the semester form says the Cup is included", async () => {
  const entry = { kidName: "Kai Joiner", contactName: "Parent Joiner", contactPhone: "+230 5900 5566" };
  const data = await (await guest.post("/api/cup/register", post({ ...entry, join: true }))).json();
  expect(data.status).toBe("form");
  const info = await (await guest.get("/api/registration", { headers: linkHeaders(data.url) })).json();
  expect(info).toMatchObject({ cup: false, cupIncluded: true, term: "2026-S2", childName: "Kai Joiner", childFeeMur: 3000 });
  expect((await db.query("SELECT member FROM club_cup_entry WHERE edition=$1", [CUP_TERM])).rows).toEqual([{ member: false }]);
  // The plain club path knows nothing about the Cup.
  const plain = await (await guest.post("/api/club/join", post({ kidName: "Ana Plain", contactName: "Parent Plain", contactPhone: "+230 5900 7788" }))).json();
  expect((await (await guest.get("/api/registration", { headers: linkHeaders(plain.url) })).json()).cupIncluded).toBe(false);
});

test("the roster takes a duckie's full name from the family's first signature, but never renames one the club typed", async ({ request }) => {
  await signIn(request, organiser);
  // The club's own roster names are deliberately short: a signature carrying a
  // longer one on the same child leaves "Zoë T." alone.
  await registeredKid(request, "Zoë T.");
  expect((await db.query("SELECT name FROM club_kid WHERE created_by IS NOT NULL")).rows).toEqual([{ name: "Zoë T." }]);
  // A family names their own duckie on the public sign-up, often with a first
  // name alone; the full name arrives with the form they sign.
  const started = await (await guest.post("/api/cup/register", post({ kidName: "Teo", contactName: "Justyna N", contactPhone: "+230 5700 2577", join: true }))).json();
  expect((await db.query("SELECT name FROM club_kid WHERE created_by IS NULL")).rows).toEqual([{ name: "Teo" }]);
  const headers = linkHeaders(started.url);
  await stageProfilePhoto(guest, headers);
  expect((await guest.post("/api/registration", { headers, data: submission(payload("Teo Niescierowicz", "justyna@example.com")) })).status()).toBe(201);
  expect((await db.query("SELECT name FROM club_kid WHERE created_by IS NULL")).rows).toEqual([{ name: "Teo Niescierowicz" }]);
});

test("the public lineup lists who is in, in sign-up order, by first name and initial only", async ({ request, playwright }) => {
  await signIn(request, organiser);
  const kidId = await registeredKid(request, "Zoë Test Surfer");
  expect((await guest.get("/api/cup/lineup")).status()).toBe(200);
  expect((await (await guest.get("/api/cup/lineup")).json()).surfers).toEqual([]);
  await guest.post("/api/cup/register", post({ kidName: "Mila Test Wildcard", contactName: "Parent Test", contactPhone: "+230 5900 1122" }));
  expect((await request.post("/api/members", post({ email: guardian }))).status()).toBe(201);
  const family = await playwright.request.newContext({ baseURL: origin });
  await signIn(family, guardian);
  expect((await family.post(`/api/cup/kids/${kidId}`, { headers: { origin } })).status()).toBe(201);
  const { surfers } = await (await guest.get("/api/cup/lineup")).json();
  expect(surfers).toEqual([
    { number: 1, name: "Mila W.", age: null, member: false, heat: null },
    { number: 2, name: "Zoë S.", age: expect.any(Number), member: true, heat: null },
  ]);
  await family.dispose();
});

test("a club family signs in, sees only its own kids and registers them; sign-in access is granted and revoked by hand", async ({ playwright, page }) => {
  // Three sign-in codes a minute: the organiser shares one session between the API and the page.
  const request = page.request;
  await signIn(request, organiser);
  const kidId = await registeredKid(request);
  await registeredKid(request, "Somebody Else", "other@example.com");
  // The guest form recognises a club family and sends them to sign in.
  const asGuest = await guest.post("/api/cup/register", post({ kidName: "zoë t.", contactName: "Test Guardian", contactPhone: "5555-1234" }));
  expect(asGuest.status()).toBe(201);
  expect((await asGuest.json()).status).toBe("member");
  expect((await db.query("SELECT count(*)::int AS n FROM club_cup_entry")).rows[0].n).toBe(0);
  // Nobody signs in until an organiser approves the guardian's email (the
  // members suite covers that unapproved addresses get no code).
  expect((await guest.get("/api/cup/kids")).status()).toBe(401);
  expect((await guest.post("/api/members", post({ email: guardian }))).status()).toBe(401);
  expect((await request.post("/api/members", { data: { email: guardian } })).status()).toBe(403);
  expect((await request.post("/api/members", post({ email: guardian }))).status()).toBe(201);
  await signIn(guest, guardian);
  let mine = await (await guest.get("/api/cup/kids")).json();
  expect(mine.email).toBe(guardian);
  expect(mine.contact).toEqual({ contactName: "Test Guardian", contactPhone: guardianPhone });
  expect(mine.kids).toEqual([{ id: kidId, name: "Zoë T.", member: false, registered: false }]);
  // Registered while the semester is unpaid: on the list, fee pending.
  expect((await guest.post(`/api/cup/kids/${kidId}`)).status()).toBe(403);
  const pending = await guest.post(`/api/cup/kids/${kidId}`, { headers: { origin } });
  expect(pending.status()).toBe(201);
  expect(await pending.json()).toEqual({ status: "pending", kidName: "Zoë T." });
  // Paid (recorded straight into the append-only history to spare a sign-in code): now a member, and free.
  await db.query("INSERT INTO club_payment_event (kid_id,term,status,note,actor_email) VALUES ($1,'2026-S2','paid','Cash',$2)", [kidId, owner]);
  mine = await (await guest.get("/api/cup/kids")).json();
  expect(mine.kids[0]).toMatchObject({ member: true, registered: true });
  expect((await (await guest.post(`/api/cup/kids/${kidId}`, { headers: { origin } })).json()).status).toBe("member");
  // Another signed-in member who is not a guardian sees nothing and cannot register the kid.
  const other = await playwright.request.newContext({ baseURL: origin });
  await signIn(other, "member@example.com");
  expect(await (await other.get("/api/cup/kids")).json()).toMatchObject({ kids: [], contact: null });
  expect((await other.post(`/api/cup/kids/${kidId}`, { headers: { origin } })).status()).toBe(404);
  await other.dispose();
  const roster = await (await request.get("/api/kids")).json();
  const zoe = roster.kids.find((k: { id: string }) => k.id === kidId);
  expect(zoe).toMatchObject({ memberPaid: true, approvedGuardians: [guardian], cup: { member: true, contactName: "Test Guardian", contactPhone: guardianPhone } });
  expect((await db.query("SELECT count(*)::int AS n FROM club_cup_entry")).rows[0].n).toBe(1);
  // The organiser sees the approval in the overview and can revoke it; the guardian's session dies with it.
  await page.goto("/#our-duckies", { waitUntil: "domcontentloaded" });
  await page.locator(".duckie-summary").filter({ hasText: "Zoë T." }).click();
  const open = page.locator(".duckie-profile[open]");
  await expect(open.getByText("Member · registered and current semester paid", { exact: true })).toBeVisible();
  await expect(open.getByText("Club member · free entry")).toBeVisible();
  await expect(open.getByText(`Test Guardian · ${guardian} · club member`)).toBeVisible();
  await open.getByRole("button", { name: "Revoke membership" }).click();
  await expect(open.getByText(`Test Guardian · ${guardian} · family access only`)).toBeVisible();
  expect((await guest.get("/api/cup/kids")).status()).toBe(401);
  await open.getByRole("button", { name: "Approve membership" }).click();
  await expect(open.getByText(`Test Guardian · ${guardian} · club member`)).toBeVisible();
  expect((await request.delete(`/api/members?email=${encodeURIComponent(organiser)}`, { headers: { origin } })).status()).toBe(400);
  expect((await request.delete(`/api/members?email=${encodeURIComponent(owner)}`, { headers: { origin } })).status()).toBe(409);
});

test("the cup page: members are sent to sign in and pick their kids; a new family is sent to the form", async ({ request, page }) => {
  await signIn(request, organiser);
  const kidId = await registeredKid(request);
  await page.goto("/sunset-duckies-cup-vol-2#register", { waitUntil: "domcontentloaded" });
  const form = page.locator("[data-cup-register][data-ready]");
  await expect(form).toBeVisible();
  const signInLink = form.getByRole("link", { name: "Sign in to register" });
  await expect(signInLink).toHaveAttribute("href", "/login?next=%2Fsunset-duckies-cup-vol-2%23register");
  await expect(form.getByLabel("Kid's name")).toBeHidden();
  // Signed in with an email no kid is registered under: a way out in each direction.
  await signIn(page.request, "member@example.com");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-member-email]")).toHaveText("member@example.com");
  const noKids = form.locator("[data-no-kids]");
  await expect(noKids).toContainText("No duckies under this email.");
  await noKids.getByRole("button", { name: "Register your kid" }).click();
  await expect(form.getByLabel("Kid's name")).toBeFocused();
  await expect(form.getByRole("radio", { name: /Not a member/ })).toBeChecked();
  await form.getByText("Already a Sunset Duckie", { exact: true }).click();
  await expect(noKids).toBeVisible();
  // "Not you?" signs out first — the login page would otherwise bounce the live session straight back.
  await form.getByRole("button", { name: "Not you?" }).click();
  await page.waitForURL(/\/login\?next=/);
  await expect(page.locator("#email-form")).toBeVisible();
  expect((await page.request.get("/api/cup/kids")).status()).toBe(401);
  // Signed in as an approved guardian: the kid list replaces the sign-in prompt.
  expect((await request.post("/api/members", post({ email: guardian }))).status()).toBe(201);
  await signIn(page.request, guardian);
  await page.goto("/sunset-duckies-cup-vol-2#register", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-member-email]")).toHaveText(guardian);
  await page.getByRole("button", { name: "Count Zoë in" }).click();
  await expect(page.locator("[data-cup-status]")).toContainText("Zoë T. is on the list! We don't see this semester's fee yet");
  await expect(page.getByRole("button", { name: "Locked in" })).toBeDisabled();
  expect((await db.query("SELECT member FROM club_cup_entry WHERE kid_id=$1", [kidId])).rows[0].member).toBe(true);
  // The lineup card shows up without a reload.
  await page.locator("#lineup").scrollIntoViewIfNeeded();
  const card = page.locator("[data-lineup-card]");
  await expect(card).toHaveCount(1);
  await expect(card.first()).toContainText("Zoë");
  await expect(card.first()).toContainText("Duckie");
  await expect(page.locator("[data-lineup-count]")).toHaveText("1 surfer locked in · spots open until the day");
  await expect(page.locator("[data-lineup-you]")).toContainText("02");
  // A new family switches to the short form and continues to the cup registration.
  await form.getByText("Not a member (yet)", { exact: true }).click();
  await form.getByLabel("Kid's name").fill("Nobody Here");
  await form.getByLabel("Parent / guardian").fill("A Parent");
  await form.getByLabel("WhatsApp number").fill("+230 5999 8877");
  await expect(form.getByRole("radio", { name: /Just the Cup/ })).toBeChecked();
  await form.getByRole("button", { name: "Count us in" }).click();
  await expect(form.locator("[data-cup-status]")).toContainText("Nobody Here is on the list");
  await page.waitForURL(/\/register#token=/);
  await expect(page.locator("#registration-intro")).toContainText("Sunset Duckies Cup Vol. 02");
  await expect(page.locator("#cup-covers")).toBeVisible();
  await expect(page.locator("#membership-covers")).toBeHidden();
  await expect(page.getByLabel("Training rhythm", { exact: true })).toBeHidden();
  await expect(page.getByLabel("Child’s full name")).toHaveValue("Nobody Here");
  // Joining the club at the same time: the semester form, with the Cup included.
  await page.goto("/sunset-duckies-cup-vol-2#register", { waitUntil: "domcontentloaded" });
  await form.getByText("Not a member (yet)", { exact: true }).click();
  await form.getByText("Join the club too", { exact: true }).click();
  await expect(form.getByRole("button", { name: "Join the club + Cup" })).toBeVisible();
  await form.getByLabel("Kid's name").fill("Kai Joiner");
  await form.getByLabel("Parent / guardian").fill("A Parent");
  await form.getByLabel("WhatsApp number").fill("+230 5999 6655");
  await form.getByRole("button", { name: "Join the club + Cup" }).click();
  await expect(form.locator("[data-cup-status]")).toContainText("membership covers the Cup");
  await page.waitForURL(/\/register#token=/);
  await expect(page.locator("#membership-covers")).toBeVisible();
  await expect(page.locator("#cup-included")).toBeVisible();
  await expect(page.getByLabel("Training rhythm", { exact: true })).toBeVisible();
  await expect(page.locator("#invitation-label")).toContainText("September 2026 semester");
  expect((await db.query("SELECT count(*)::int AS n FROM club_cup_entry WHERE edition=$1", [CUP_TERM])).rows[0].n).toBe(3);
});

test("a signed-in family registers an existing kid and adds a sibling to the club and Cup without switching paths", async ({ request, page }) => {
  await signIn(request, organiser);
  const robynId = await registeredKid(request, "Robyn");
  await registeredKid(request, "Unrelated Kid", "someone-else@example.com");
  await request.post("/api/members", post({ email: guardian }));
  await signIn(page.request, guardian);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sunset-duckies-cup-vol-2#register", { waitUntil: "domcontentloaded" });
  const form = page.locator("[data-cup-register][data-ready]");
  await form.getByRole("button", { name: "Count Robyn in" }).click();
  await expect(form.getByRole("button", { name: "Locked in" })).toBeDisabled();
  const add = form.getByRole("button", { name: "Add sibling", exact: true });
  await add.click();
  await expect(form.getByRole("radio", { name: /Already a Sunset Duckie/ })).toBeChecked();
  await expect(form.getByRole("button", { name: "Locked in" })).toBeVisible();
  await expect(form.getByLabel("Kid's name")).toBeFocused();
  await expect(form.getByLabel("Parent / guardian")).toHaveValue("Test Guardian");
  await expect(form.getByLabel("WhatsApp number")).toHaveValue(guardianPhone);
  await expect(form.getByRole("radio", { name: /Just the Cup/ })).toBeHidden();
  await form.getByRole("button", { name: "Cancel adding sibling" }).click();
  await expect(form.getByLabel("Kid's name")).toBeHidden();
  await expect(add).toBeFocused();
  await add.click();
  await form.getByLabel("Kid's name").fill("Taylor");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("add-sibling-mobile.png") });
  const responsePromise = page.waitForResponse(r => r.url().endsWith("/api/cup/register") && r.request().method() === "POST");
  await form.getByRole("button", { name: "Add sibling to club + Cup" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const signup = await response.json();
  await page.waitForURL(/\/register#token=/);
  await expect(page.locator("#cup-included")).toBeVisible();
  await expect(page.getByLabel("Child’s full name")).toHaveValue("Taylor");
  await expect(page.getByLabel("Full name · guardian 1", { exact: true })).toHaveValue("Test Guardian");
  await expect(page.getByLabel("Email · guardian 1", { exact: true })).toHaveValue(guardian);
  await expect(page.getByLabel("Phone · guardian 1", { exact: true })).toHaveValue(guardianPhone);
  await stageProfilePhoto(page.request, linkHeaders(signup.url));
  expect((await page.request.post("/api/registration", { headers: linkHeaders(signup.url), data: submission(payload("Taylor")) })).status()).toBe(201);
  await page.goto("/sunset-duckies-cup-vol-2#register", { waitUntil: "domcontentloaded" });
  await expect(form.locator("[data-kid-list]")).toContainText("Robyn");
  await expect(form.locator("[data-kid-list]")).toContainText("Taylor");
  await expect(form.getByRole("button", { name: "Locked in" })).toHaveCount(2);
  await expect(form.locator("[data-kid-list]")).not.toContainText("Unrelated Kid");
  const entries = (await db.query("SELECT k.name,c.kid_id FROM club_cup_entry c JOIN club_kid k ON k.id=c.kid_id WHERE edition=$1 ORDER BY k.name", [CUP_TERM])).rows;
  expect(entries.map(k => k.name)).toEqual(["Robyn", "Taylor"]);
  expect(entries[0].kid_id).toBe(robynId);
  const taylor = (await db.query("SELECT w.term, w.snapshot->'registration'->'guardians'->0->>'email' AS email FROM club_signed_waiver w WHERE kid_id=$1", [entries[1].kid_id])).rows;
  expect(taylor).toEqual([{ term: "2026-S2", email: guardian }]);
  expect((await db.query("SELECT count(*)::int AS n FROM club_payment_event WHERE kid_id=$1", [entries[1].kid_id])).rows[0].n).toBe(0);
});

test("the join page sends a family straight to a pending registration", async ({ page }) => {
  await page.goto("/join", { waitUntil: "domcontentloaded" });
  const form = page.locator("[data-join][data-ready]");
  await expect(form).toBeVisible();
  await form.getByLabel("Kid's name").fill("Joiner Kid");
  await form.getByLabel("Parent / guardian").fill("Joiner Parent");
  await form.getByLabel("WhatsApp number").fill("+230 5777 6655");
  await form.getByRole("button", { name: "Start the registration" }).click();
  await expect(form.locator("[data-join-status]")).toContainText("Joiner Kid is on the list as pending");
  await page.waitForURL(/\/register#token=/);
  await expect(page.locator("#registration-intro")).toContainText("confirmed once the semester fee is paid — Rs 3,000 for one child or Rs 5,000 for a family");
  await expect(page.locator("#membership-covers")).toBeVisible();
  await expect(page.getByLabel("Training rhythm", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Child’s full name")).toHaveValue("Joiner Kid");
});

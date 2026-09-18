import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from "@playwright/test";
import pg from "pg";
import { signIn } from "./auth-helpers";
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
  expect((await guest.post("/api/registration", { headers: linkHeaders(link.url), data: payload(undefined, email) })).status()).toBe(201);
  return kidId;
}
async function pay(playwright: PlaywrightWorkerArgs["playwright"], kidId: string, term = "2026-S2") {
  const andras = await playwright.request.newContext({ baseURL: origin });
  await signIn(andras, owner);
  expect((await andras.post(`/api/kids/${kidId}/payment`, post({ term, status: "paid", amountMur: null, note: "Cash" }))).status()).toBe(201);
  await andras.dispose();
}
test.beforeEach(async ({ playwright }) => {
  await db.query('TRUNCATE club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit CASCADE');
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
  expect((await guest.post("/api/registration", { headers: linkHeaders(data.url), data: payload("Noa New") })).status()).toBe(201);
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
  expect((await guest.post("/api/registration", { headers: linkHeaders(again.url), data: noRhythm })).status()).toBe(201);
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
  expect((await (await other.get("/api/cup/kids")).json()).kids).toEqual([]);
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
  await expect(open.getByText(`Test Guardian · ${guardian} · can sign in`)).toBeVisible();
  await open.getByRole("button", { name: "Revoke sign-in" }).click();
  await expect(open.getByText(`Test Guardian · ${guardian} · no access`)).toBeVisible();
  expect((await guest.get("/api/cup/kids")).status()).toBe(401);
  await open.getByRole("button", { name: "Approve sign-in" }).click();
  await expect(open.getByText(`Test Guardian · ${guardian} · can sign in`)).toBeVisible();
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
  // Signed in as an approved guardian: the kid list replaces the sign-in prompt.
  expect((await request.post("/api/members", post({ email: guardian }))).status()).toBe(201);
  await signIn(page.request, guardian);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-member-email]")).toHaveText(guardian);
  await page.getByRole("button", { name: "Count Zoë in" }).click();
  await expect(page.locator("[data-cup-status]")).toContainText("Zoë T. is on the list! We don't see this semester's fee yet");
  await expect(page.getByRole("button", { name: "Locked in" })).toBeDisabled();
  expect((await db.query("SELECT member FROM club_cup_entry WHERE kid_id=$1", [kidId])).rows[0].member).toBe(true);
  // A new family switches to the short form and continues to the cup registration.
  await form.getByText("Not a member (yet)", { exact: true }).click();
  await form.getByLabel("Kid's name").fill("Nobody Here");
  await form.getByLabel("Parent / guardian").fill("A Parent");
  await form.getByLabel("WhatsApp number").fill("+230 5999 8877");
  await form.getByRole("button", { name: "Count us in" }).click();
  await expect(form.locator("[data-cup-status]")).toContainText("Nobody Here is on the list");
  await page.waitForURL(/\/register#token=/);
  await expect(page.locator("#registration-intro")).toContainText("Sunset Duckies Cup Vol. 02");
  await expect(page.locator("#cup-covers")).toBeVisible();
  await expect(page.locator("#membership-covers")).toBeHidden();
  await expect(page.getByLabel("Training rhythm", { exact: true })).toBeHidden();
  await expect(page.getByLabel("Child’s full name")).toHaveValue("Nobody Here");
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

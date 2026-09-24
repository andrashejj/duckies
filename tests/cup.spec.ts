import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from "@playwright/test";
import pg from "pg";
import { signIn } from "./auth-helpers";
import { chooseProfilePhoto, submission, stageProfilePhoto } from "./registration-helpers";
import { WAIVER_VERSION } from "../src/lib/registration/policy";
import { CUP_TERM } from "../src/lib/registration/cup";
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329";
const owner = "andras@hejj.xyz";
const organiser = "organiser@example.com";
const guardian = "guardian@example.com";
const guardianPhone = "+230 5555 1234";
function payload(childName = "Zoë Test Surfer", email = guardian, phone = guardianPhone) {
  return {
    version: WAIVER_VERSION, childName, dateOfBirth: "2017-10-01",
    guardians: [{ name: "Test Guardian", relationship: "Father", phone, email }],
    emergencyName: "Emergency Person", emergencyRelationship: "Aunt", emergencyPhone: "+230 5555 9999",
    medicalNotes: "", sessionsPerWeek: "2", media: "yes", parentInWater: true, swimming: true, reef: true, gear: true,
    waiverAccepted: true, electronicConsent: true, signerName: "Test Guardian", signature: [],
  };
}
const linkHeaders = (url: string) => ({ origin, authorization: `Bearer ${new URLSearchParams(new URL(url).hash.slice(1)).get("token")!}` });
const post = (data: Record<string, unknown>) => ({ headers: { origin }, data });
let guest: APIRequestContext;
// The public form: a draft of its own, a photo per child, then the signature
// with the family's one choice — the club, the Cup, or both.
async function draft(context = guest) {
  const response = await context.post("/api/registration/draft", { headers: { origin } });
  expect(response.status()).toBe(201);
  return linkHeaders((await response.json()).url);
}
async function signDraft(plan: "club" | "cup" | "both" | undefined, ...children: Record<string, any>[]) {
  const headers = await draft();
  for (const slot of children.keys()) await stageProfilePhoto(guest, headers, slot);
  const response = await guest.post("/api/registration", { headers, data: { ...submission(...children), ...(plan ? { plan } : {}) } });
  return { response, headers };
}
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
  test(`the public form opens blank, and choosing ${type} shapes it`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    const plan = page.locator("#registration-plan");
    await expect(plan).toBeVisible();
    await expect(plan.locator("input:checked")).toHaveCount(0);
    await expect(page.locator("#registration-form")).toBeVisible();
    await expect(page.getByLabel("Child’s full name")).toHaveValue("");
    await expect(page.getByLabel("Full name · guardian 1", { exact: true })).toHaveValue("");
    await expect(page.locator("#invitation-label")).toBeHidden();
    await plan.locator(`[value="${type}"]`).check();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator("#registration-scope")).toContainText(cupOnly ? "Cup only" : cupIncluded ? "membership and your Cup entry" : "Cup page");
    await expect(page.locator("#cup-covers")).toBeVisible({ visible: cupOnly });
    await expect(page.locator("#membership-covers")).toBeVisible({ visible: !cupOnly });
    await expect(page.locator("#cup-included")).toBeVisible({ visible: cupIncluded });
    await expect(page.getByLabel("Training rhythm", { exact: true })).toBeVisible({ visible: !cupOnly });
    await expect(page.locator("#submit-registration")).toContainText(cupOnly ? "Cup entry" : "club membership");
    // Visiting stores nothing; the first photo opens a draft, kept in the address bar.
    expect((await db.query("SELECT count(*)::int AS n FROM club_registration_link")).rows[0].n).toBe(0);
    await chooseProfilePhoto(page.locator("[data-child]").first());
    await expect(page).toHaveURL(/#token=/);
    expect(await (await guest.get("/api/registration", { headers: linkHeaders(page.url()) })).json()).toMatchObject({ draft: true });
    expect((await db.query("SELECT count(*)::int AS n FROM club_kid")).rows[0].n).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // A link that names the choice arrives with it made.
    await page.goto(`/register?plan=${type}`, { waitUntil: "domcontentloaded" });
    await expect(plan.locator(`[value="${type}"]`)).toBeChecked();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    // Sharing the bare link again must not carry over the previous family's details.
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await expect(plan.locator("input:checked")).toHaveCount(0);
    await expect(page.getByLabel("Child’s full name")).toHaveValue("");
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

test("anyone joins the club from the public form: nothing on the roster until they sign, then pending until Andras records the fee", async ({ request, playwright }) => {
  expect((await guest.post("/api/registration/draft")).status()).toBe(403);
  const headers = await draft();
  expect(await (await guest.get("/api/registration", { headers })).json()).toMatchObject({ draft: true, maxChildren: 6, version: WAIVER_VERSION });
  await stageProfilePhoto(guest, headers);
  expect((await db.query("SELECT count(*)::int AS n FROM club_kid")).rows[0].n).toBe(0);
  // The form has to say what it is for.
  const missing = await guest.post("/api/registration", { headers, data: submission(payload("Noa New")) });
  expect(missing.status()).toBe(400);
  expect((await missing.json()).error).toContain("Choose club membership, the Cup, or both");
  expect((await guest.post("/api/registration", { headers, data: { ...submission(payload("Noa New")), plan: "club" } })).status()).toBe(201);
  const info = await (await guest.get("/api/registration", { headers })).json();
  expect(info).toMatchObject({ cup: false, cupIncluded: false, paid: false, term: "2026-S2", childName: "Noa New", childFeeMur: 3000, familyFeeMur: 5000 });
  expect(info.completedAt).toBeTruthy();
  expect((await db.query("SELECT count(*)::int AS n FROM club_cup_entry")).rows[0].n).toBe(0);
  // The same guardian on a fresh public form re-signs the same duckie — a
  // renewal, not a second child — but nobody else can sign for them by name
  // and number alone.
  const stranger = await signDraft("club", payload("Noa New", "stranger@example.com"));
  expect(stranger.response.status()).toBe(400);
  expect((await stranger.response.json()).error).toContain("already registered with the club");
  const again = await signDraft("club", payload("Noa New"));
  expect(again.response.status()).toBe(201);
  expect((await db.query("SELECT count(*)::int AS n FROM club_kid")).rows[0].n).toBe(1);
  expect((await db.query("SELECT count(*)::int AS n FROM club_signed_waiver")).rows[0].n).toBe(2);
  await signIn(request, organiser);
  let kid = (await (await request.get("/api/kids")).json()).kids[0];
  expect(kid).toMatchObject({ name: "Noa New", contactName: "Test Guardian", contactPhone: guardianPhone, payment: null, memberPaid: false, approvedGuardians: [] });
  expect(kid.waiverId).toBeTruthy();
  expect(kid.link.completedAt).toBeTruthy();
  // Only Andras confirms the payment; that is what makes the kid a member.
  expect((await request.post(`/api/kids/${kid.id}/payment`, post({ term: "2026-S2", status: "paid", amountMur: 3000, note: "Cash" }))).status()).toBe(403);
  await pay(playwright, kid.id);
  kid = (await (await request.get("/api/kids")).json()).kids[0];
  expect(kid.memberPaid).toBe(true);
});

test("public drafts are rate limited per address", async () => {
  for (let i = 0; i < 8; i++) await draft();
  expect((await guest.post("/api/registration/draft", { headers: { origin } })).status()).toBe(429);
});

test("a cup-only family signs the same form without a training rhythm and shows up flagged", async ({ request }) => {
  const { sessionsPerWeek, ...noRhythm } = payload("Mila Test", "mila@example.com", "+230 5900 1122");
  const { response, headers } = await signDraft("cup", noRhythm);
  expect(response.status()).toBe(201);
  expect(await (await guest.get("/api/registration", { headers })).json()).toMatchObject({ cup: true, term: CUP_TERM, termLabel: "Sunset Duckies Cup Vol. 02", childName: "Mila Test" });
  const record = (await db.query("SELECT snapshot FROM club_signed_waiver")).rows[0].snapshot;
  expect(record.term).toBe(CUP_TERM);
  expect(record.evidence.method).toBe("public-form-electronic-signature");
  expect(record.registration.sessionsPerWeek).toBeUndefined();
  await signIn(request, organiser);
  const roster = await (await request.get(`/api/kids?term=${CUP_TERM}`)).json();
  expect(roster.termLabel).toBe("Sunset Duckies Cup Vol. 02");
  expect(roster.kids[0]).toMatchObject({ name: "Mila Test", cup: { edition: CUP_TERM, member: false, plan: "cup", contactName: "Test Guardian", contactPhone: "+230 5900 1122" }, payment: null, memberPaid: false });
  expect(roster.kids[0].waiverId).toBeTruthy();
});

test("a family joining the club and the Cup signs the semester form, and every child on it comes to the Cup", async () => {
  const phone = "+230 5900 5566";
  const { response, headers } = await signDraft("both", payload("Kai Joiner", "kai@example.com", phone), payload("Lou Joiner", "kai@example.com", phone));
  expect(response.status()).toBe(201);
  expect(await (await guest.get("/api/registration", { headers })).json()).toMatchObject({ cup: false, cupIncluded: true, term: "2026-S2", childName: "Kai Joiner", childFeeMur: 3000 });
  expect((await db.query("SELECT k.name, c.member, c.plan FROM club_cup_entry c JOIN club_kid k ON k.id=c.kid_id WHERE edition=$1 ORDER BY k.name", [CUP_TERM])).rows)
    .toEqual([{ name: "Kai Joiner", member: false, plan: "club" }, { name: "Lou Joiner", member: false, plan: "club" }]);
  expect((await db.query("SELECT DISTINCT term FROM club_signed_waiver")).rows).toEqual([{ term: "2026-S2" }]);
  // The plain club form knows nothing about the Cup.
  const plain = await signDraft("club", payload("Ana Plain", "ana@example.com", "+230 5900 7788"));
  expect((await (await guest.get("/api/registration", { headers: plain.headers })).json()).cupIncluded).toBe(false);
  expect((await db.query("SELECT count(*)::int AS n FROM club_cup_entry")).rows[0].n).toBe(2);
});

test("the roster tells a family who joined the club apart from a cup-only entry", async ({ request, page }) => {
  await signIn(request, organiser);
  await page.context().addCookies((await request.storageState()).cookies);
  await signDraft("both", payload("Kai Joiner", "kai@example.com", "+230 5900 5566"));
  await signDraft("cup", payload("Nina Visitor", "nina@example.com", "+230 5900 9900"));
  expect((await db.query("SELECT k.name, c.plan FROM club_cup_entry c JOIN club_kid k ON k.id=c.kid_id ORDER BY k.name")).rows)
    .toEqual([{ name: "Kai Joiner", plan: "club" }, { name: "Nina Visitor", plan: "cup" }]);
  await page.goto("/#our-duckies", { waitUntil: "domcontentloaded" });
  const joining = page.locator(".duckie-profile").filter({ hasText: "Kai Joiner" });
  await joining.locator(".duckie-summary").click();
  await expect(joining).toContainText("Club registration on file, semester unpaid");
  await expect(joining).not.toContainText("Cup-only");
  const visitor = page.locator(".duckie-profile").filter({ hasText: "Nina Visitor" });
  await visitor.locator(".duckie-summary").click();
  await expect(visitor).toContainText("Cup-only · Rs 1000 entry ·");
  await expect(visitor).not.toContainText("cup form not signed yet");
});

test("the roster takes a duckie's full name from the family's first signature, but never renames one the club typed", async ({ request }) => {
  await signIn(request, organiser);
  // The club's own roster names are deliberately short: a signature carrying a
  // longer one on the same child leaves "Zoë T." alone.
  await registeredKid(request, "Zoë T.");
  expect((await db.query("SELECT name FROM club_kid WHERE created_by IS NOT NULL")).rows).toEqual([{ name: "Zoë T." }]);
  // A family the club only knows by first name and WhatsApp number — here from
  // the old short sign-up — signs the public form with the full name.
  const { rows: [teo] } = await db.query("INSERT INTO club_kid (name, contact_name, contact_phone) VALUES ('Teo','Justyna N','+230 5700 2577') RETURNING id");
  await db.query("INSERT INTO club_cup_entry (kid_id, edition, member, plan, contact_name, contact_phone) VALUES ($1,$2,false,'club','Justyna N','+230 5700 2577')", [teo.id, CUP_TERM]);
  const invitation = await (await request.post(`/api/kids/${teo.id}/link`, { headers: { origin } })).json();
  const { response } = await signDraft("both", payload("Teo Niescierowicz", "justyna@example.com", "+23057002577"));
  expect(response.status()).toBe(201);
  // The same duckie, not a second one: renamed, signed, still on the Cup list,
  // and the invitation the club had sent is answered.
  expect((await db.query("SELECT id, name FROM club_kid WHERE created_by IS NULL")).rows).toEqual([{ id: teo.id, name: "Teo Niescierowicz" }]);
  expect((await db.query("SELECT kid_id FROM club_signed_waiver WHERE term='2026-S2' AND kid_id=$1", [teo.id])).rowCount).toBe(1);
  expect((await db.query("SELECT plan FROM club_cup_entry WHERE kid_id=$1", [teo.id])).rows).toEqual([{ plan: "club" }]);
  expect((await guest.get("/api/registration", { headers: linkHeaders(invitation.url) })).status()).toBe(404);
});

test("the public form picks up a pending duckie the club already recorded a fee for, and the guardian becomes a member", async ({ request, playwright }) => {
  await signIn(request, organiser);
  const { rows: [teo] } = await db.query("INSERT INTO club_kid (name, contact_name, contact_phone) VALUES ('Teo','Justyna N','+230 5700 2577') RETURNING id");
  await pay(playwright, teo.id);
  expect((await signDraft("club", payload("Teo", "justyna@example.com", "5700 2577"))).response.status()).toBe(201);
  const kid = (await (await request.get("/api/kids")).json()).kids.find((k: { id: string }) => k.id === teo.id);
  expect(kid).toMatchObject({ memberPaid: true, approvedGuardians: ["justyna@example.com"] });
  expect((await db.query("SELECT count(*)::int AS n FROM club_kid")).rows[0].n).toBe(1);
});

// A family whose older duckie is already registered — last semester, or on a
// form of their own — puts them on the new sibling's form. The guardian
// signing is on the older registration, so both are signed and on the Cup
// list; a name and a number alone, or a guardian the record does not know,
// still cannot re-sign it.
test("a returning duckie comes along on a sibling's public form when the signing guardian is already on their registration", async ({ request }) => {
  await signIn(request, organiser);
  await db.query("INSERT INTO club_semester (id,label,starts_on,ends_on,child_fee_mur,family_fee_mur) VALUES ('2026-S1','February 2026 semester','2026-02-01','2026-06-30',3000,5000) ON CONFLICT (id) DO NOTHING");
  const phone = "+230 5811 2233";
  const mother = { name: "Theola Parent", relationship: "Mother", phone, email: "theola@example.com" };
  // The other parent shares the family number, so the form finds Marc either way.
  const father = { name: "Other Parent", relationship: "Father", phone, email: "other.parent@example.com" };
  const family = (childName: string, ...guardians: typeof mother[]) =>
    ({ ...payload(childName, mother.email, phone), guardians, signerName: guardians[0].name });
  // Marc signed for last semester through the club's invitation, by his mother.
  const marc = (await (await request.post("/api/kids", post({ name: "Marc-Emmanuel" }))).json()).kid.id as string;
  const link = await (await request.post(`/api/kids/${marc}/link?term=2026-S1`, { headers: { origin } })).json();
  await stageProfilePhoto(guest, linkHeaders(link.url));
  expect((await guest.post("/api/registration", { headers: linkHeaders(link.url), data: submission(family("Marc-Emmanuel Family", mother)) })).status()).toBe(201);
  // The father, not on Marc's registration, cannot sign for him from the public form.
  const byFather = await signDraft("both", family("Emma-Jayne Family", father), family("Marc-Emmanuel Family", father));
  expect(byFather.response.status()).toBe(400);
  expect((await byFather.response.json()).error).toContain("Marc-Emmanuel Family is already registered with the club. Sign in");
  // Nor can the mother add him as a guardian through it.
  const addingFather = await signDraft("both", family("Emma-Jayne Family", mother, father), family("Marc-Emmanuel Family", mother, father));
  expect(addingFather.response.status()).toBe(400);
  expect((await addingFather.response.json()).error).toContain("Other Parent is not on their registration yet");
  expect((await db.query("SELECT count(*)::int AS n FROM club_kid")).rows[0].n).toBe(1);
  // The mother signs for both: one new duckie, one renewed, both on the Cup list.
  const { response } = await signDraft("both", family("Emma-Jayne Family", mother), family("Marc-Emmanuel Family", mother));
  expect(response.status()).toBe(201);
  expect((await db.query(`SELECT k.name, k.created_by IS NOT NULL AS club_named,
      (SELECT string_agg(w.term, ',' ORDER BY w.signed_at) FROM club_signed_waiver w WHERE w.kid_id=k.id) AS terms,
      (SELECT plan FROM club_cup_entry c WHERE c.kid_id=k.id AND c.edition=$1) AS cup
    FROM club_kid k ORDER BY k.name`, [CUP_TERM])).rows).toEqual([
    { name: "Emma-Jayne Family", club_named: false, terms: "2026-S2", cup: "club" },
    { name: "Marc-Emmanuel", club_named: true, terms: "2026-S1,2026-S2", cup: "club" },
  ]);
});

test("the public lineup lists who is in, in sign-up order, by first name and initial only", async ({ request, playwright }) => {
  await signIn(request, organiser);
  const kidId = await registeredKid(request, "Zoë Test Surfer");
  expect((await guest.get("/api/cup/lineup")).status()).toBe(200);
  expect((await (await guest.get("/api/cup/lineup")).json()).surfers).toEqual([]);
  await signDraft("cup", payload("Mila Test Wildcard", "mila@example.com", "+230 5900 1122"));
  expect((await request.post("/api/members", post({ email: guardian }))).status()).toBe(201);
  const family = await playwright.request.newContext({ baseURL: origin });
  await signIn(family, guardian);
  expect((await family.post(`/api/cup/kids/${kidId}`, { headers: { origin } })).status()).toBe(201);
  const { surfers } = await (await guest.get("/api/cup/lineup")).json();
  expect(surfers).toEqual([
    { number: 1, name: "Mila W.", age: expect.any(Number), member: false, heat: null },
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
  // The public form recognises a club family; someone who is not on the
  // duckie's registration is sent to sign in.
  const asGuest = await signDraft("cup", payload("zoë t.", "other@example.com", "5555-1234"));
  expect(asGuest.response.status()).toBe(400);
  expect((await asGuest.response.json()).error).toContain("Sign in with the guardian email");
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

test("the cup page: members are sent to sign in and pick their kids; a new family is sent to the registration form", async ({ request, page }) => {
  await signIn(request, organiser);
  const kidId = await registeredKid(request);
  await page.goto("/sunset-duckies-cup-vol-2#register", { waitUntil: "domcontentloaded" });
  const form = page.locator("[data-cup-register][data-ready]");
  await expect(form).toBeVisible();
  const signInLink = form.getByRole("link", { name: "Sign in to register" });
  await expect(signInLink).toHaveAttribute("href", "/login?next=%2Fsunset-duckies-cup-vol-2%23register");
  await expect(form.getByRole("link", { name: /Just the Cup/ })).toBeHidden();
  // Signed in with an email no kid is registered under: a way out in each direction.
  await signIn(page.request, "member@example.com");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-member-email]")).toHaveText("member@example.com");
  const noKids = form.locator("[data-no-kids]");
  await expect(noKids).toContainText("No duckies under this email.");
  await noKids.getByRole("button", { name: "Register your kid" }).click();
  await expect(form.getByRole("link", { name: /Just the Cup/ })).toBeFocused();
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
  expect((await db.query("SELECT member, plan FROM club_cup_entry WHERE kid_id=$1", [kidId])).rows[0]).toEqual({ member: true, plan: "club" });
  // The lineup card shows up without a reload.
  await page.locator("#lineup").scrollIntoViewIfNeeded();
  const card = page.locator("[data-lineup-card]");
  await expect(card).toHaveCount(1);
  await expect(card.first()).toContainText("Zoë");
  await expect(card.first()).toContainText("Duckie");
  await expect(page.locator("[data-lineup-count]")).toHaveText("1 surfer locked in · spots open until the day");
  await expect(page.locator("[data-lineup-you]")).toContainText("02");
  // A new family picks the Cup alone, or the club with it, and lands on the one form.
  await form.getByText("Not a member (yet)", { exact: true }).click();
  await form.getByRole("link", { name: /Just the Cup/ }).click();
  await page.waitForURL(/\/register\?plan=cup$/);
  await expect(page.locator('#registration-plan [value="cup"]')).toBeChecked();
  await expect(page.locator("#registration-intro")).toContainText("Sunset Duckies Cup Vol. 02");
  await expect(page.locator("#cup-covers")).toBeVisible();
  await expect(page.locator("#membership-covers")).toBeHidden();
  await expect(page.getByLabel("Training rhythm", { exact: true })).toBeHidden();
  await page.goto("/sunset-duckies-cup-vol-2#register", { waitUntil: "domcontentloaded" });
  await form.getByText("Not a member (yet)", { exact: true }).click();
  await form.getByRole("link", { name: /Join the club too/ }).click();
  await page.waitForURL(/\/register\?plan=both$/);
  await expect(page.locator("#membership-covers")).toBeVisible();
  await expect(page.locator("#cup-included")).toBeVisible();
  await expect(page.getByLabel("Training rhythm", { exact: true })).toBeVisible();
  await expect(page.locator("#registration-scope")).toContainText("September 2026 semester");
  // Nobody new is on the list until a form is signed.
  expect((await db.query("SELECT count(*)::int AS n FROM club_cup_entry WHERE edition=$1", [CUP_TERM])).rows[0].n).toBe(1);
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
  // A sibling joins the club and the Cup on the one form, with this guardian carried over.
  await form.getByRole("link", { name: "Add a sibling to the club + Cup" }).click();
  await page.waitForURL(/\/register\?plan=both$/);
  await expect(page.locator('#registration-plan [value="both"]')).toBeChecked();
  await expect(page.locator("#cup-included")).toBeVisible();
  await expect(page.getByLabel("Full name · guardian 1", { exact: true })).toHaveValue("Test Guardian");
  await expect(page.getByLabel("Email · guardian 1", { exact: true })).toHaveValue(guardian);
  await expect(page.getByLabel("Phone · guardian 1", { exact: true })).toHaveValue(guardianPhone);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("add-sibling-mobile.png") });
  await chooseProfilePhoto(page.locator("[data-child]").first());
  await expect(page).toHaveURL(/#token=/);
  expect((await page.request.post("/api/registration", { headers: linkHeaders(page.url()), data: { ...submission(payload("Taylor")), plan: "both" } })).status()).toBe(201);
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

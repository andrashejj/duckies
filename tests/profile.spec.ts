import { test, expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";
import { signIn } from "./auth-helpers";
import { submission, stageProfilePhoto } from "./registration-helpers";
import { readFile } from "node:fs/promises";
import { WAIVER_VERSION } from "../src/lib/registration/policy";

// A family's own page: what a guardian sees about their duckies, what they
// may change, and everything they must never reach.
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329";
const owner = "andras@hejj.xyz";
const organiser = "organiser@example.com";
const guardian = "guardian@example.com";
const stranger = "member@example.com";
const post = (data?: Record<string, unknown>) => ({ headers: { origin }, ...(data ? { data } : {}) });

function payload(childName: string, email: string) {
  return {
    version: WAIVER_VERSION, childName, dateOfBirth: "2017-10-01",
    guardians: [{ name: "Test Guardian", relationship: "Father", phone: "+230 5555 1234", email }],
    emergencyName: "Emergency Person", emergencyRelationship: "Aunt", emergencyPhone: "+230 5555 9999",
    medicalNotes: "Peanut allergy", sessionsPerWeek: "2", media: "yes", parentInWater: true, swimming: true,
    reef: true, gear: true, waiverAccepted: true, electronicConsent: true, signerName: "Test Guardian", signature: [],
  };
}
const linkHeaders = (url: string) => ({ origin, authorization: `Bearer ${new URLSearchParams(new URL(url).hash.slice(1)).get("token")!}` });
const png = () => sharp({ create: { width: 640, height: 640, channels: 3, background: "#ff4e2b" } }).png().toBuffer();

let guest: APIRequestContext;
// A kid on the roster whose guardian has signed the semester registration.
async function registeredKid(request: APIRequestContext, name: string, email: string) {
  const kidId = (await (await request.post("/api/kids", post({ name }))).json()).kid.id as string;
  const link = await (await request.post(`/api/kids/${kidId}/link`, post())).json();
  await stageProfilePhoto(guest, linkHeaders(link.url));
  expect((await guest.post("/api/registration", { headers: linkHeaders(link.url), data: submission(payload(name, email)) })).status()).toBe(201);
  return kidId;
}
// Recorded straight into the append-only history: it spares a sign-in code.
const pay = (kidId: string, term = "2026-S2") =>
  db.query("INSERT INTO club_payment_event (kid_id,term,status,amount_mur,note,actor_email) VALUES ($1,$2,'paid',3000,'Cash',$3)", [kidId, term, owner]);

test.beforeEach(async ({ playwright }) => {
  await db.query('TRUNCATE club_member_archive,club_parent_profile,club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit CASCADE');
  await db.query(
    "INSERT INTO club_member(email,role) VALUES ($1,'organiser'),($2,'organiser'),($3,'member'),($4,'member')",
    [owner, organiser, guardian, stranger],
  );
  guest = await playwright.request.newContext({ baseURL: origin });
});
test.afterEach(async () => { await guest.dispose(); });
test.afterAll(async () => { await db.end(); });

test("the family page and its API are shut to anonymous, forged and unrelated sign-ins", async ({ request, playwright }) => {
  await signIn(request, organiser);
  const mine = await registeredKid(request, "Zoë T.", guardian);
  const originalPhoto = (await db.query("SELECT image FROM club_kid_photo WHERE kid_id=$1", [mine])).rows[0].image;

  const anonymous: Record<string, string>[] = [{}, { cookie: "duckies.session_token=fake" }];
  for (const headers of anonymous) {
    const family = await guest.get("/api/family", { headers });
    expect(family.status()).toBe(401);
    expect(family.headers()["cache-control"]).toContain("no-store");
    expect(family.headers()["vary"]).toContain("Cookie");
    expect(await family.text()).not.toContain("Zoë");
    expect((await guest.get(`/api/family/kids/${mine}/photo`, { headers })).status()).toBe(401);
    expect((await guest.post(`/api/family/kids/${mine}/form`, { headers: { origin, ...headers } })).status()).toBe(401);
  }
  const redirect = await guest.get("/members/profile", { maxRedirects: 0 });
  expect(redirect.status()).toBe(302);
  expect(redirect.headers().location).toBe("/login?next=%2Fmembers%2Fprofile");

  // Signed in, but not a guardian on this kid's registration: an empty family
  // and a closed door on every route that names someone else's duckie.
  const other = await playwright.request.newContext({ baseURL: origin });
  await signIn(other, stranger);
  expect((await (await other.get("/api/family")).json()).kids).toEqual([]);
  expect((await other.patch(`/api/family/kids/${mine}`, post({ contactName: "Intruder", contactPhone: "+230 5000 0000" }))).status()).toBe(404);
  expect((await other.get(`/api/family/kids/${mine}/photo`)).status()).toBe(404);
  expect((await other.put(`/api/family/kids/${mine}/photo`, { headers: { origin, "Content-Type": "image/png" }, data: await png() })).status()).toBe(404);
  expect((await other.post(`/api/family/kids/${mine}/form`, post())).status()).toBe(404);
  const waiverId = (await db.query("SELECT id FROM club_signed_waiver WHERE kid_id=$1", [mine])).rows[0].id;
  expect((await other.get(`/api/waivers/${waiverId}`)).status()).toBe(403);
  expect((await guest.get(`/api/waivers/${waiverId}`)).status()).toBe(401);
  // Nothing was written by any of it.
  expect((await db.query("SELECT contact_name FROM club_kid WHERE id=$1", [mine])).rows[0].contact_name).toBeNull();
  expect((await db.query("SELECT image FROM club_kid_photo WHERE kid_id=$1", [mine])).rows[0].image).toEqual(originalPhoto);
  await other.dispose();
});

test("a guardian's page shows their own duckies, records and standing — and no one else's", async ({ page, playwright }) => {
  const admin = await playwright.request.newContext({ baseURL: origin });
  await signIn(admin, organiser);
  const mine = await registeredKid(admin, "Zoë T.", guardian);
  const theirs = await registeredKid(admin, "Somebody Else", "other@example.com");
  await pay(mine);
  await admin.dispose();

  // The browser itself signs in as the guardian, so the page is their own.
  const family = page.request;
  await signIn(family, guardian);
  const profile = await (await family.get("/api/family")).json();
  expect(profile).toMatchObject({ email: guardian, term: { id: "2026-S2" } });
  expect(profile.kids).toHaveLength(1);
  const kid = profile.kids[0];
  expect(kid).toMatchObject({ id: mine, name: "Zoë T.", member: true, age: expect.any(Number) });
  expect(kid.waiver).toMatchObject({ term: "2026-S2" });
  expect(kid.payment).toMatchObject({ status: "paid", termLabel: "September 2026 semester" });
  // The organiser's own payment note and who recorded it stay in the club's books.
  expect(JSON.stringify(profile)).not.toContain("Cash");
  expect(kid.history.waivers).toHaveLength(1);
  expect(kid.history.payments).toHaveLength(1);
  // The signed record comes back for its own family, without the strokes.
  expect(kid.registration).toMatchObject({ medicalNotes: "Peanut allergy", media: "yes", sessionsPerWeek: "2" });
  expect(kid.registration.signature).toBeUndefined();

  // Their own PDF and signature record; the other family's is not found.
  expect((await family.get(`/api/waivers/${kid.waiver.id}`)).status()).toBe(200);
  expect((await (await family.get(`/api/waivers/${kid.waiver.id}?format=audit`)).json()).algorithm).toBe("Ed25519");
  const theirWaiver = (await db.query("SELECT id FROM club_signed_waiver WHERE kid_id=$1", [theirs])).rows[0].id;
  expect((await family.get(`/api/waivers/${theirWaiver}`)).status()).toBe(403);

  await page.goto("/members/profile", { waitUntil: "domcontentloaded" });
  const passes = page.locator("[data-duckie-pass]");
  await expect(passes).toHaveCount(1);
  await expect(passes.first()).toContainText("Zoë T.");
  await expect(passes.first()).toHaveAttribute("data-standing", "ok");
  await expect(passes.first().getByText("Member", { exact: true })).toBeVisible();
  await expect(page.getByText("Somebody Else")).toHaveCount(0);
  // The picture on the card is the way to change it: pick a file and it saves.
  const portrait = passes.first().getByAltText("Zoë T.'s profile photo");
  const staged = await portrait.getAttribute("src");
  const picker = passes.first().getByLabel("Change photo for Zoë T.");
  await expect(picker).toBeEnabled();
  await picker.setInputFiles({ name: "zoe.png", mimeType: "image/png", buffer: await png() });
  await expect(page.locator("[data-profile-status]")).toHaveText("Zoë T.'s photo is saved.");
  await expect(portrait).not.toHaveAttribute("src", staged!);
  expect((await db.query("SELECT source FROM club_kid_photo WHERE kid_id=$1", [mine])).rows[0].source).toBe("guardian");
  // Secondary dates and fees stay available without dominating the family page.
  await page.getByText("Club dates & semester fees", { exact: true }).click();
  await expect(page.getByRole("list", { name: "Upcoming club dates" }).getByText("Monday training").first()).toBeVisible();
  await expect(page.getByText("September 2026 semester").first()).toBeVisible();
  // The record and the history are one click away.
  await passes.first().getByText("Details, history + changes").click();
  await expect(passes.first().getByText("Peanut allergy")).toBeVisible();
  await expect(passes.first().getByText("Change photo", { exact: true })).toBeVisible();
  await expect(passes.first().getByRole("button", { name: "Remove photo" })).toBeVisible();
  await expect(passes.first().getByRole("link", { name: "Download PDF" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByText("Rs 3,000", { exact: false }).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/members-profile-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/members-profile-mobile.png", fullPage: true });
  // Dark mode re-points the sticker tints, so the type on them must follow.
  await page.getByRole("button",{name:"Switch to dark mode"}).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.screenshot({ path: "test-results/members-profile-dark.png", fullPage: true });
});

test("a guardian keeps their own details current, and corrects a signed record by signing it again", async ({ request, playwright }) => {
  await signIn(request, organiser);
  const kidId = await registeredKid(request, "Zoë T.", guardian);
  const firstLink = await (await request.post(`/api/kids/${kidId}/link`, post())).json();

  const family = await playwright.request.newContext({ baseURL: origin });
  await signIn(family, guardian);

  // The name the club greets them by. Cross-origin writes never land.
  expect((await family.patch("/api/family", { data: { name: "Mireille B." } })).status()).toBe(403);
  expect((await family.patch("/api/family", post({ name: "" }))).status()).toBe(400);
  expect((await family.patch("/api/family", post({ name: "Mireille B." }))).status()).toBe(200);
  expect((await db.query('SELECT name FROM "user" WHERE email=$1', [guardian])).rows[0].name).toBe("Mireille B.");

  // The working contact on this duckie's card — not the signed registration.
  expect((await family.patch(`/api/family/kids/${kidId}`, post({ contactName: "Mireille B.", contactPhone: "nope" }))).status()).toBe(400);
  expect((await family.patch(`/api/family/kids/${kidId}`, post({ contactName: "Mireille B.", contactPhone: "+230 5777 4321" }))).status()).toBe(200);
  expect((await db.query("SELECT contact_name, contact_phone FROM club_kid WHERE id=$1", [kidId])).rows[0])
    .toEqual({ contact_name: "Mireille B.", contact_phone: "+230 5777 4321" });
  // The signed record is untouched by any of it.
  expect((await db.query("SELECT snapshot->'registration'->'guardians'->0->>'phone' AS phone FROM club_signed_waiver WHERE kid_id=$1", [kidId])).rows[0].phone)
    .toBe("+230 5555 1234");

  // A profile photo, re-encoded on the way in and private on the way out.
  expect((await family.put(`/api/family/kids/${kidId}/photo`, { headers: { "Content-Type": "image/png" }, data: await png() })).status()).toBe(403);
  expect((await family.put(`/api/family/kids/${kidId}/photo`, { headers: { origin, "Content-Type": "image/png" }, data: await png() })).status()).toBe(200);
  expect((await db.query("SELECT source FROM club_kid_photo WHERE kid_id=$1", [kidId])).rows[0].source).toBe("guardian");
  const photo = await family.get(`/api/family/kids/${kidId}/photo`);
  expect(photo.headers()["content-type"]).toBe("image/webp");
  expect(photo.headers()["cache-control"]).toContain("no-store");
  expect((await sharp(await photo.body()).metadata()).format).toBe("webp");
  expect((await family.delete(`/api/family/kids/${kidId}/photo`, post())).status()).toBe(200);
  expect((await family.get(`/api/family/kids/${kidId}/photo`)).status()).toBe(404);

  // Correcting the signed details: a fresh private form, emailed and on
  // screen, which replaces the invitation the club had open.
  const issued = await family.post(`/api/family/kids/${kidId}/form`, post());
  expect(issued.status()).toBe(201);
  const form = await issued.json();
  expect(form).toMatchObject({ emailed: true, term: "September 2026 semester" });
  expect((await guest.get("/api/registration", { headers: linkHeaders(firstLink.url) })).status()).toBe(404);
  const opened = await guest.get("/api/registration", { headers: linkHeaders(form.url) });
  expect(opened.status()).toBe(200);
  // A fresh link never prefills from an earlier record.
  expect(await opened.json()).toMatchObject({ childName: "Zoë T.", term: "2026-S2", signed: null });
  const mail = (await readFile(process.env.DUCKIES_TEST_MAIL_FILE!, "utf8")).trim().split("\n").map(line => JSON.parse(line));
  const sent = mail.findLast(message => message.to[0] === guardian && message.subject.includes("registration form"));
  expect(sent.text).toContain(form.url);

  // Signing it again adds a record; the club keeps both, newest first.
  await stageProfilePhoto(guest, linkHeaders(form.url));
  expect((await guest.post("/api/registration", { headers: linkHeaders(form.url), data: submission({ ...payload("Zoë T.", guardian), medicalNotes: "No allergies after all" }) })).status()).toBe(201);
  const profile = await (await family.get("/api/family")).json();
  expect(profile.kids[0].registration.medicalNotes).toBe("No allergies after all");
  expect(profile.kids[0].history.waivers).toHaveLength(2);
  await family.dispose();
});

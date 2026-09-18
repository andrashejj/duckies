import { test, expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";
import { signIn } from "./auth-helpers";
import { WAIVER_VERSION } from "../src/lib/registration/policy";
import { CUP_TERM } from "../src/lib/registration/cup";
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329";
const owner = "andras@hejj.xyz";
const organiser = "organiser@example.com";
const guardianPhone = "+230 5555 1234";
function payload(childName = "Zoë Test Surfer") {
  return {
    version: WAIVER_VERSION, childName, dateOfBirth: "2017-10-01",
    guardians: [{ name: "Test Guardian", relationship: "Father", phone: guardianPhone, email: "guardian@example.com" }],
    emergencyName: "Emergency Person", emergencyRelationship: "Aunt", emergencyPhone: "+230 5555 9999",
    medicalNotes: "", sessionsPerWeek: "2", media: "yes", parentInWater: true, swimming: true, reef: true, gear: true,
    waiverAccepted: true, electronicConsent: true, signerName: "Test Guardian", signature: [],
  };
}
const linkHeaders = (url: string) => ({ origin, authorization: `Bearer ${new URLSearchParams(new URL(url).hash.slice(1)).get("token")!}` });
const cupEntry = (data: Record<string, unknown>) => ({ headers: { origin }, data });
let guest: APIRequestContext;
test.beforeEach(async ({ playwright }) => {
  await db.query('TRUNCATE club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit CASCADE');
  await db.query("INSERT INTO club_member(email,role) VALUES ($1,'organiser'),($2,'organiser')", [owner, organiser]);
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

test("a cup-only kid gets a private link, signs the club form without a training rhythm and shows up flagged", async ({ request }) => {
  const entry = { kidName: "Mila Test", member: false, contactName: "Parent Test", contactPhone: "+230 5900 1122" };
  expect((await guest.post("/api/cup/register", { data: entry })).status()).toBe(403);
  expect((await guest.post("/api/cup/register", cupEntry({ ...entry, contactPhone: "nope" }))).status()).toBe(400);
  const result = await guest.post("/api/cup/register", cupEntry(entry));
  expect(result.status()).toBe(201);
  const data = await result.json();
  expect(data.status).toBe("form");
  const headers = linkHeaders(data.url);
  const info = await (await guest.get("/api/registration", { headers })).json();
  expect(info).toMatchObject({ cup: true, term: CUP_TERM, termLabel: "Sunset Duckies Cup Vol. 02", childName: "Mila Test" });
  // A second submit before signing re-issues the link instead of adding a kid; the first link is gone.
  const again = await (await guest.post("/api/cup/register", cupEntry(entry))).json();
  expect(again.status).toBe("form");
  expect((await guest.get("/api/registration", { headers })).status()).toBe(404);
  const { sessionsPerWeek, ...noRhythm } = payload("Mila Test");
  const signed = await guest.post("/api/registration", { headers: linkHeaders(again.url), data: noRhythm });
  expect(signed.status()).toBe(201);
  expect((await (await guest.post("/api/cup/register", cupEntry(entry))).json()).status).toBe("signed");
  expect((await db.query("SELECT count(*)::int AS n FROM club_kid")).rows[0].n).toBe(1);
  const record = (await db.query("SELECT snapshot FROM club_signed_waiver")).rows[0].snapshot;
  expect(record.term).toBe(CUP_TERM);
  expect(record.registration.sessionsPerWeek).toBeUndefined();
  await signIn(request, organiser);
  const roster = await (await request.get(`/api/kids?term=${CUP_TERM}`)).json();
  expect(roster.termLabel).toBe("Sunset Duckies Cup Vol. 02");
  expect(roster.kids[0]).toMatchObject({ name: "Mila Test", cup: { edition: CUP_TERM, member: false, contactName: "Parent Test", contactPhone: "+230 5900 1122" }, payment: null });
  expect(roster.kids[0].waiverId).toBeTruthy();
});

test("a member registers with the kid's name and a number from the signed registration, without the form", async ({ request, playwright, page }) => {
  await signIn(request, organiser);
  const kidId = (await (await request.post("/api/kids", { headers: { origin }, data: { name: "Zoë T." } })).json()).kid.id;
  const andras = await playwright.request.newContext({ baseURL: origin });
  await signIn(andras, owner);
  expect((await andras.post(`/api/kids/${kidId}/payment`, { headers: { origin }, data: { term: "2026-S2", status: "paid", amountMur: null, note: "Paid" } })).status()).toBe(201);
  await andras.dispose();
  const link = await (await request.post(`/api/kids/${kidId}/link`, { headers: { origin } })).json();
  const headers = linkHeaders(link.url);
  // Nobody is on the cup list before the club form is signed, however the name is spelled.
  const entry = { kidName: "Zoë T.", member: true, contactName: "Test Guardian", contactPhone: guardianPhone };
  expect((await guest.post("/api/cup/register", cupEntry(entry))).status()).toBe(404);
  // A semester link still insists on the training rhythm.
  const { sessionsPerWeek, ...noRhythm } = payload();
  const refused = await guest.post("/api/registration", { headers, data: noRhythm });
  expect(refused.status()).toBe(400);
  expect((await refused.json()).error).toContain("training rhythm");
  expect((await guest.post("/api/registration", { headers, data: payload() })).status()).toBe(201);
  // Wrong number: no match, and nothing leaks about the kid.
  const wrong = await guest.post("/api/cup/register", cupEntry({ ...entry, contactPhone: "+230 5555 0000" }));
  expect(wrong.status()).toBe(404);
  expect(await wrong.text()).not.toContain("Zoë");
  // Guardian number in another format, then the registration's child name with the emergency number: one entry.
  const ok = await guest.post("/api/cup/register", cupEntry({ ...entry, contactPhone: "5555-1234" }));
  expect(ok.status()).toBe(201);
  expect(await ok.json()).toEqual({ status: "member", kidName: "Zoë T." });
  expect((await guest.post("/api/cup/register", cupEntry({ ...entry, kidName: "zoë test surfer", contactPhone: "55559999" }))).status()).toBe(201);
  expect((await db.query("SELECT count(*)::int AS n FROM club_kid")).rows[0].n).toBe(1);
  expect((await db.query("SELECT count(*)::int AS n FROM club_cup_entry WHERE member")).rows[0].n).toBe(1);
  // The organiser sees the flag in the roster and can filter the cup list.
  await signIn(page.request, organiser);
  await page.goto("/#our-duckies", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".duckie-flag")).toHaveText("Cup 02");
  await page.getByLabel("Show", { exact: true }).selectOption("cup");
  await expect(page.locator(".duckie-row:visible")).toHaveCount(1);
  await page.locator(".duckie-summary").click();
  await expect(page.locator(".duckie-profile[open]")).toContainText("Club member · free entry");
});

test("the cup page form takes a member and sends a new family to the registration form", async ({ page }) => {
  await page.goto("/sunset-duckies-cup-vol-2#register", { waitUntil: "domcontentloaded" });
  // The dev server may reload the page once while it optimises dependencies; type only once the form script is live.
  const form = page.locator("[data-cup-register][data-ready]");
  await expect(form).toBeVisible();
  await expect(form.getByText("that's how we find them")).toBeVisible();
  await form.getByLabel("Kid's name").fill("Nobody Here");
  await form.getByLabel("Parent / guardian").fill("A Parent");
  await form.getByLabel("WhatsApp number").fill("+230 5999 8877");
  await form.getByRole("button", { name: "Count us in" }).click();
  await expect(form.locator("[data-cup-status]")).toContainText("couldn't find a signed club registration");
  await form.getByText("Not a member (yet)").click();
  await expect(form.getByText("registration form + waiver. Rs 1,000 entry")).toBeVisible();
  await form.getByRole("button", { name: "Count us in" }).click();
  await expect(form.locator("[data-cup-status]")).toContainText("Nobody Here is on the list");
  await page.waitForURL(/\/register#token=/);
  await expect(page.locator("#registration-intro")).toContainText("Sunset Duckies Cup Vol. 02");
  await expect(page.locator("#cup-covers")).toBeVisible();
  await expect(page.locator("#membership-covers")).toBeHidden();
  await expect(page.getByLabel("Training rhythm", { exact: true })).toBeHidden();
  await expect(page.getByLabel("Child’s full name")).toHaveValue("Nobody Here");
  await expect(page.locator("#invitation-label")).toContainText("Sunset Duckies Cup Vol. 02");
});

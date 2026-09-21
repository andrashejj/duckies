import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { verify, createHash } from "node:crypto";
import pg from "pg";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { signIn } from "./auth-helpers";
import { submission } from "./registration-helpers";
import { correctBirthDate } from "../src/lib/registration/birth-date-corrections";
import { getDatabase } from "../src/lib/server/db";
import { readEntrants } from "../src/lib/server/comp";
import { WAIVER_VERSION } from "../src/lib/registration/policy";
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329";
let kidId: string;
const owner = "andras@hejj.xyz";
const organiser = "organiser@example.com";
function payload() {
  return {
    version: WAIVER_VERSION,
    childName: "Zoë Test Surfer",
    dateOfBirth: "2017-10-01",
    guardians: [
      {
        name: "Test Guardian",
        relationship: "Father",
        phone: "+230 5555 1234",
        email: "guardian@example.com",
      },
      {
        name: "Second Guardian",
        relationship: "Mother",
        phone: "+230 5555 5678",
        email: "second@example.com",
      },
    ],
    emergencyName: "Emergency Person",
    emergencyRelationship: "Aunt",
    emergencyPhone: "+230 5555 9999",
    medicalNotes: "PRIVATE allergy note",
    sessionsPerWeek: "2",
    media: "no",
    parentInWater: true,
    swimming: true,
    reef: true,
    gear: true,
    waiverAccepted: true,
    electronicConsent: true,
    signerName: "Test Guardian",
    signature: [
      [
        [0.1, 0.7],
        [0.3, 0.2],
        [0.4, 0.6],
        [0.8, 0.3],
      ],
    ],
  };
}
async function issue(request: APIRequestContext) {
  const result = await request.post(`/api/kids/${kidId}/link`, {
    headers: { origin },
  });
  expect(result.status()).toBe(201);
  const data = await result.json();
  const token = new URLSearchParams(new URL(data.url).hash.slice(1)).get(
    "token",
  )!;
  return {
    ...data,
    token,
    headers: { origin, authorization: `Bearer ${token}` },
  };
}
async function complete(
  request: APIRequestContext,
  headers: Record<string, string>,
  data: Record<string, unknown> = payload(),
) {
  return request.post("/api/registration", { headers, data: submission(data) });
}
// Only the owner records payments, and links only open once the semester is
// paid. One owner sign-in per test keeps the OTP sender under its rate limit.
let andras: APIRequestContext;
async function pay(status: "paid" | "unpaid" = "paid") {
  const result = await andras.post(`/api/kids/${kidId}/payment`, {
    headers: { origin },
    data: { term: "2026-S2", status, amountMur: null, note: `Marked ${status} before registration` },
  });
  expect(result.status()).toBe(201);
}
test.beforeEach(async ({ request, playwright }) => {
  await db.query(
    'TRUNCATE club_member_archive,club_parent_profile,club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit CASCADE',
  );
  await db.query(
    "INSERT INTO club_member(email,role) VALUES ($1,'organiser'),($2,'organiser'),('member@example.com','member')",
    [owner, organiser],
  );
  await signIn(request, organiser);
  kidId = (
    await (
      await request.post("/api/kids", {
        headers: { origin },
        data: { name: "Test Surfer" },
      })
    ).json()
  ).kid.id;
  andras = await playwright.request.newContext({ baseURL: origin });
  await signIn(andras, owner);
  await pay();
});
test.afterEach(async () => {
  await andras.dispose();
});
test.afterAll(async () => {
  await db.end();
  await getDatabase().end();
});

test("individual links are hashed, replaceable, revocable, expiring, and do not expose existing family data", async ({
  request,
  playwright,
}) => {
  // Registration comes before payment: an unpaid kid still gets a link.
  await pay("unpaid");
  const first = await issue(request);
  await pay("paid");
  const second = await issue(request);
  expect(
    (
      await request.get("/api/registration", { headers: first.headers })
    ).status(),
  ).toBe(404);
  expect(
    JSON.stringify(
      (await db.query("SELECT * FROM club_registration_link")).rows,
    ),
  ).not.toContain(second.token);
  const guest = await playwright.request.newContext({ baseURL: origin });
  const response = await guest.get("/api/registration", {
    headers: second.headers,
  });
  expect(response.status()).toBe(200);
  const info = await response.json();
  expect(Object.keys(info)).not.toContain("guardians");
  expect(info.signed).toBeNull();
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(
    (
      await guest.post(`/api/kids/${kidId}/link`, { headers: { origin } })
    ).status(),
  ).toBe(401);
  await request.delete(`/api/kids/${kidId}/link`, { headers: { origin } });
  expect(
    (
      await guest.get("/api/registration", { headers: second.headers })
    ).status(),
  ).toBe(404);
  const third = await issue(request);
  await db.query(
    "UPDATE club_registration_link SET expires_at=now()-interval '1 day'",
  );
  expect((await complete(guest, third.headers)).status()).toBe(404);
  await guest.dispose();
});

test("guest signing persists the exact PDF, choices and verifiable seal; concurrent replay cannot overwrite", async ({
  request,
  playwright,
}) => {
  const invitation = await issue(request);
  const guest = await playwright.request.newContext({ baseURL: origin });
  const attempts = await Promise.all([
    complete(guest, invitation.headers),
    complete(guest, invitation.headers),
  ]);
  expect(attempts.map((r) => r.status()).sort()).toEqual([201, 409]);
  const record = (await db.query("SELECT * FROM club_signed_waiver")).rows[0];
  expect(record.snapshot.registration.media).toBe("no");
  expect(record.snapshot.registration.guardians).toHaveLength(2);
  const pdfResponse = await guest.get("/api/registration/document", {
    headers: invitation.headers,
  });
  expect(pdfResponse.status()).toBe(200);
  const bytes = await pdfResponse.body();
  expect(bytes.equals(record.pdf)).toBe(true);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    record.pdf_sha256,
  );
  expect(
    verify(
      null,
      Buffer.from(`${record.payload_sha256}.${record.pdf_sha256}`),
      record.public_key,
      Buffer.from(record.seal, "base64"),
    ),
  ).toBe(true);
  const document = await PDFDocument.load(bytes);
  expect(document.getPageCount()).toBeGreaterThanOrEqual(2);
  await writeFile("test-results/signed-waiver.pdf", bytes);
  await expect(
    db.query("UPDATE club_signed_waiver SET pdf='bad'::bytea WHERE id=$1", [
      record.id,
    ]),
  ).rejects.toThrow("append-only");
  await expect(
    db.query("DELETE FROM club_signed_waiver WHERE id=$1", [record.id]),
  ).rejects.toThrow("append-only");
  const audit = await (
    await guest.get("/api/registration/document?format=audit", {
      headers: invitation.headers,
    })
  ).json();
  expect(JSON.parse(audit.canonicalPayload).policy.title).toContain("waiver");
  await guest.dispose();
});

test("mandatory acknowledgements, explicit media choice, legal guardian and consent are enforced on the server", async ({
  request,
}) => {
  const invitation = await issue(request);
  for (const key of [
    "parentInWater",
    "swimming",
    "reef",
    "gear",
    "waiverAccepted",
    "electronicConsent",
  ]) {
    const data = { ...payload(), [key]: false };
    expect((await complete(request, invitation.headers, data)).status()).toBe(
      400,
    );
  }
  for (const patch of [
    { media: undefined },
    { signerName: "Someone else" },
    { dateOfBirth: "2100-01-01" },
    { version: "outdated" },
    { paymentStatus: "paid" },
    { childId: "forged" },
    { division: "duck" },
    { supersedes: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" }, // nothing to correct yet
  ])
    expect(
      (
        await request.post("/api/registration", {
          headers: invitation.headers,
          data: submission({ ...payload(), ...patch }),
        })
      ).status(),
    ).toBe(400);
  expect(
    (
      await complete(request, {
        ...invitation.headers,
        origin: "https://outside.example",
      })
    ).status(),
  ).toBe(403);
  expect((await db.query("SELECT * FROM club_signed_waiver")).rowCount).toBe(0);
});

test("ordinary members cannot read contacts, medical information, payments or signed documents", async ({
  request,
  playwright,
}) => {
  const invitation = await issue(request);
  const signed = await complete(request, invitation.headers);
  const id = (await signed.json()).id;
  const member = await playwright.request.newContext({ baseURL: origin });
  await signIn(member, "member@example.com");
  const roster = await (await member.get("/api/kids")).json();
  expect(roster.kids).toEqual([{ id: kidId, name: "Test Surfer" }]);
  expect(JSON.stringify(roster)).not.toContain("PRIVATE");
  for (const route of [`/api/waivers/${id}`, `/api/kids/${kidId}/records`])
    expect((await member.get(route)).status()).toBe(403);
  expect(
    (
      await member.post(`/api/kids/${kidId}/link`, { headers: { origin } })
    ).status(),
  ).toBe(403);
  const staff = await (await request.get("/api/kids")).json();
  expect(staff.kids[0].age).toBe(8);
  expect(staff.kids[0].registration.emergencyPhone).toBe("+230 5555 9999");
  await member.dispose();
});

test("only the verified owner changes payments, preserving an append-only history", async ({
  request,
}) => {
  const payment = {
    term: "2026-S2",
    status: "paid",
    amountMur: null,
    note: "Reported payment; amount not supplied",
  };
  expect(
    (
      await request.post(`/api/kids/${kidId}/payment`, {
        headers: { origin, "x-email": owner },
        data: { ...payment, actor_email: owner },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await andras.post(`/api/kids/${kidId}/payment`, {
        headers: { origin },
        data: payment,
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await andras.post(`/api/kids/${kidId}/payment`, {
        headers: { origin },
        data: {
          term: "2026-S2",
          status: "unpaid",
          amountMur: null,
          note: "Correcting a report",
        },
      })
    ).status(),
  ).toBe(201);
  expect((await db.query("SELECT * FROM club_payment_event")).rowCount).toBe(3);
  await expect(
    db.query("UPDATE club_payment_event SET status='paid'"),
  ).rejects.toThrow("append-only");
  expect(
    (
      await andras.post(`/api/kids/${kidId}/payment`, {
        headers: { origin: "https://outside.example" },
        data: payment,
      })
    ).status(),
  ).toBe(403);
  await db.query("UPDATE club_member SET role='member' WHERE email=$1", [
    owner,
  ]);
  expect(
    (
      await andras.post(`/api/kids/${kidId}/payment`, {
        headers: { origin },
        data: payment,
      })
    ).status(),
  ).toBe(403);
});

test("corrections append new signed versions; archiving preserves signed records and invalidates links", async ({
  request,
}) => {
  let invitation = await issue(request);
  const first = await (await complete(request, invitation.headers)).json();
  // The family corrects through the same link by naming the record it replaces.
  const info = await (
    await request.get("/api/registration", { headers: invitation.headers })
  ).json();
  expect(info.signed.id).toBe(first.id);
  expect(info.signed.registration.dateOfBirth).toBe("2017-10-01");
  expect(
    (await complete(request, invitation.headers, { ...payload(), dateOfBirth: "2018-02-03" })).status(),
  ).toBe(409);
  // A correction re-signs for the same child, named by the id the form holds.
  expect(first.children[0].kidId).toBe(kidId);
  const corrected = await complete(request, invitation.headers, {
    ...payload(),
    dateOfBirth: "2018-02-03",
    kidId,
    supersedes: first.id,
  });
  expect(corrected.status()).toBe(201);
  expect(
    (
      await complete(request, invitation.headers, { ...payload(), kidId, supersedes: first.id })
    ).status(),
  ).toBe(409); // stale: only the latest record can be corrected
  const latest = (
    await db.query("SELECT snapshot FROM club_signed_waiver ORDER BY signed_at DESC LIMIT 1")
  ).rows[0].snapshot;
  expect(latest.evidence.supersedes).toBe(first.id);
  expect(latest.registration.supersedes).toBeUndefined();
  expect(
    (await (await request.get("/api/kids")).json()).kids[0].registration.dateOfBirth,
  ).toBe("2018-02-03");
  invitation = await issue(request);
  await complete(request, invitation.headers, { ...payload(), media: "yes" });
  expect((await db.query("SELECT * FROM club_signed_waiver")).rowCount).toBe(3);
  expect(
    (await (await request.get("/api/kids")).json()).kids[0].registration.media,
  ).toBe("yes");
  await request.delete(`/api/kids/${kidId}`, { headers: { origin } });
  expect(
    (
      await request.get("/api/registration", { headers: invitation.headers })
    ).status(),
  ).toBe(404);
  expect((await (await request.get("/api/kids")).json()).kids).toEqual([]);
  const history = await (
    await request.get(`/api/kids/${kidId}/records`)
  ).json();
  expect(history.waivers).toHaveLength(3);
  expect(
    (await request.get(`/api/waivers/${history.waivers[0].id}`)).status(),
  ).toBe(200);
  expect(await (await request.get("/admin/kids/archived")).text()).toContain(
    "Test Surfer",
  );
});

test("private signing has no account requirement, no public prefill, and a bounded download window", async ({
  request,
}) => {
  const invitation = await issue(request);
  const publicPage = await request.get("/register");
  expect(await publicPage.text()).not.toContain("Test Surfer");
  expect(publicPage.headers()["referrer-policy"]).toBe("no-referrer");
  await complete(request, invitation.headers);
  await db.query(
    "UPDATE club_registration_link SET completed_at=now()-interval '2 hours'",
  );
  expect(
    (
      await request.get("/api/registration/document", {
        headers: invitation.headers,
      })
    ).status(),
  ).toBe(410);
  expect((await request.get("/api/registration/document")).status()).toBe(404);
  const mail = await readFile(process.env.DUCKIES_TEST_MAIL_FILE!, "utf8");
  expect(mail).not.toContain("PRIVATE allergy note");
});

test("mobile guardian completes, signs and downloads; organiser sees acknowledgements and can share a new link", async ({
  request,
  page,
}) => {
  const invitation = await issue(request);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(invitation.url, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#registration-form")).toBeVisible();
  await expect(page.getByText("Nothing else is included", { exact: true })).toBeVisible();
  expect(await page.locator('[name="division"], [name="rashieSize"], [name="membership"]').count()).toBe(0);
  await page.getByLabel("Date of birth", { exact: true }).fill("2017-10-01");
  for (const [label, value] of [
    ["Full name · guardian 1", "Test Guardian"],
    ["Relationship · guardian 1", "Father"],
    ["Phone · guardian 1", "+230 5555 1234"],
    ["Email · guardian 1", "guardian@example.com"],
    ["Type your full name to sign", "Test Guardian"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  // The emergency contact mirrors guardian 1 until the family overrides it.
  await expect(page.getByLabel("Emergency contact name", { exact: true })).toHaveValue("Test Guardian");
  await expect(page.getByLabel("Emergency number", { exact: true })).toHaveValue("+230 5555 1234");
  await page.getByLabel("Same as the first legal guardian", { exact: true }).uncheck();
  for (const [label, value] of [
    ["Emergency contact name", "Emergency Person"],
    ["Relationship to child", "Aunt"],
    ["Emergency number", "+230 5555 9999"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  const pad = page.locator("#signature-pad");
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 60, { steps: 6 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Clear drawing", exact: true }).click();
  expect(
    await pad.evaluate((c: HTMLCanvasElement) =>
      c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0),
    ),
  ).toBe(false);
  for (const box of await page.locator('#registration-form input[type="checkbox"][required]').all())
    await box.check();
  await page.locator('input[name="media"][value="no"]').check();
  let submissions = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/registration" && request.method() === "POST") submissions++;
  });
  const submit = page.locator("#submit-registration");
  const rhythm = page.getByLabel("Training rhythm", { exact: true });
  await submit.click();
  await expect(rhythm).toBeFocused();
  await expect(rhythm).toBeInViewport();
  await expect(rhythm).toHaveAttribute("aria-invalid", "true");
  await expect(rhythm).toHaveAccessibleDescription("Choose a training rhythm.");
  await expect(page.getByText("Choose a training rhythm.", { exact: true })).toBeInViewport();
  await expect(page.locator("#validation-summary")).toContainText("highlighted fields");
  expect(submissions).toBe(0);
  await rhythm.selectOption("2");
  await expect(rhythm).not.toHaveAttribute("aria-invalid");
  await expect(page.locator("#validation-summary")).toBeEmpty();

  // Invalid values and unchecked acknowledgements receive the same visible
  // feedback, and fixing one field moves the next attempt to the next error.
  const email = page.getByLabel("Email · guardian 1", { exact: true });
  const birthday = page.getByLabel("Date of birth", { exact: true });
  const consent = page.locator('[name="electronicConsent"]');
  await email.fill("not-an-email");
  await birthday.fill("2100-01-01");
  await consent.uncheck();
  await submit.click();
  await expect(birthday).toBeFocused();
  await expect(birthday).toBeInViewport();
  await expect(birthday).toHaveAccessibleDescription("Date of birth cannot be in the future.");
  await expect(email).toHaveAccessibleDescription(/Enter a valid email address/);
  await expect(consent).toHaveAccessibleDescription("Tick this box to continue.");
  expect(submissions).toBe(0);
  await birthday.fill("2017-10-01");
  await email.fill("guardian@example.com");
  await submit.click();
  await expect(consent).toBeFocused();
  await expect(consent).toBeInViewport();
  await consent.check();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
  const parentPhoto = page.getByLabel("Profile photo · guardian 1 (optional)", { exact: true });
  await parentPhoto.setInputFiles({ name: "parent.png", mimeType: "image/png", buffer: await sharp({ create: { width: 32, height: 32, channels: 3, background: "#e9a366" } }).png().toBuffer() });
  await expect(page.locator('[data-guardian] [data-photo-status]')).toContainText("Photo uploaded.");
  await expect(email).toHaveAttribute("readonly", "");

  await page
    .getByRole("button", { name: /^Sign and submit/ })
    .click();
  await expect(page.locator("#signed-result")).toBeVisible({ timeout: 20000 });
  const savedParent = (await db.query("SELECT name,phone,image FROM club_parent_profile WHERE email='guardian@example.com'")).rows[0];
  expect(savedParent.name).toBe("Test Guardian");
  expect(savedParent.phone).toBe("+230 5555 1234");
  expect(savedParent.image.toString("ascii", 8, 12)).toBe("WEBP");
  // Corrections reopen the signed details through the same link.
  await page.getByRole("button", { name: "Edit details, add a duckie, sign again", exact: true }).click();
  await expect(page.getByLabel("Full name · guardian 1", { exact: true })).toHaveValue("Test Guardian");
  await expect(page.getByLabel("Emergency contact name", { exact: true })).toHaveValue("Emergency Person");
  await page.getByLabel("Date of birth", { exact: true }).fill("2017-03-13");
  for (const box of await page.locator('#registration-form input[type="checkbox"][required]').all())
    await box.check();
  await page.getByRole("button", { name: /^Sign and submit/ }).click();
  await expect(page.locator("#signed-result")).toBeVisible({ timeout: 20000 });
  expect((await db.query("SELECT * FROM club_signed_waiver")).rowCount).toBe(2);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /^Download signed waiver/ })
    .click();
  expect((await download).suggestedFilename()).toContain(".pdf");
  await page.screenshot({
    path: "test-results/registration-mobile-signed.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await signIn(page.request, owner);
  await page.goto("/#our-duckies", { waitUntil: "domcontentloaded" });
  await page.locator(".duckie-summary").click();
  await expect(
    page.getByText("NO CONSENT — exclude or blur", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("9 years · born 2017-03-13", { exact: true })).toBeVisible();
  await expect(page.getByText("Twice a week · Monday + Friday", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Update payment", exact: true })
    .click();
  await page.locator('select[name="payment-status"]').selectOption("unpaid");
  await page
    .getByLabel("Payment note / reference", { exact: true })
    .fill("Refunded");
  await page
    .getByRole("button", { name: /^Save payment status/ })
    .click();
  await expect(page.getByText(/Unpaid · amount not recorded · Refunded/)).toBeVisible();
  await expect(page.getByText("Pending · registered, current semester not paid", { exact: true })).toBeVisible();
  // Links no longer wait for payment; the WhatsApp text says the place is pending.
  await page
    .getByRole("button", { name: "Generate registration link", exact: true })
    .click();
  await expect(page.getByRole("link", { name: "Send via WhatsApp" })).toHaveAttribute("href", /confirmed%20once%20the%20semester%20fee/);
  await page
    .getByRole("button", { name: "Update payment", exact: true })
    .click();
  await page.locator('select[name="payment-status"]').selectOption("paid");
  await page
    .getByLabel("Payment note / reference", { exact: true })
    .fill("Received at session");
  await page
    .getByRole("button", { name: /^Save payment status/ })
    .click();
  await expect(
    page.getByText(/Paid · amount not recorded · Received at session/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate registration link", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Send via WhatsApp" }),
  ).toHaveAttribute("href", /^https:\/\/wa.me\//);
  await page
    .locator("[data-members]")
    .screenshot({ path: "test-results/registration-overview-mobile.png" });
  expect(errors).toEqual([]);
});

// A family with three duckies fills in three children and signs once. Each
// child still gets their own sealed record, and the link reopens with all of
// them so a fourth can be added.
test("a family fills in every child on one form and signs the waiver once for all of them", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const join = page.locator("[data-join][data-ready]");
  await page.goto("/join", { waitUntil: "domcontentloaded" });
  await join.getByLabel("Kid's name").fill("Ana Sibling");
  await join.getByLabel("Parent / guardian").fill("Sibling Parent");
  await join.getByLabel("WhatsApp number").fill("+230 5722 3344");
  await join.getByRole("button", { name: "Start the registration" }).click();
  await page.waitForURL(/\/register#token=/);
  await expect(page.locator("#registration-form")).toBeVisible();

  // The invited child opens the form; the rest of the family joins them on it.
  await expect(page.locator("[data-child]")).toHaveCount(1);
  await expect(page.getByLabel("Child’s full name", { exact: true })).toHaveValue("Ana Sibling");
  await page.getByRole("button", { name: "Add another child", exact: true }).click();
  await page.getByRole("button", { name: "Add another child", exact: true }).click();
  await expect(page.locator("[data-child]")).toHaveCount(3);
  const names = ["Ana Sibling", "Bo Sibling", "Cy Sibling"];
  async function fillChildren(children: string[], from = 0) {
    for (const [index, name] of children.entries()) {
      const at = from + index + 1;
      await page.getByLabel(`Child’s full name · duckie ${at}`, { exact: true }).fill(name);
      await page.getByLabel(`Date of birth · duckie ${at}`, { exact: true }).fill(`201${5 + index}-05-04`);
      await page.getByLabel(`Training rhythm · duckie ${at}`, { exact: true }).selectOption(index === 1 ? "1" : "2");
      await page
        .getByLabel(`Medical conditions, allergies or medication · duckie ${at}`, { exact: true })
        .fill(index === 2 ? "Peanut allergy" : "");
    }
  }
  await fillChildren(names);
  // Guardians, emergency contact, waiver and signature: filled in once.
  await expect(page.locator('[data-field="childName"]')).toHaveCount(3);
  expect(await page.locator('[name="signerName"]').count()).toBe(1);
  async function signOnce() {
    for (const [label, value] of [
      ["Full name · guardian 1", "Sibling Parent"],
      ["Relationship · guardian 1", "Mother"],
      ["Phone · guardian 1", "+230 5722 3344"],
      ["Email · guardian 1", "sibling.parent@example.com"],
      ["Type your full name to sign", "Sibling Parent"],
    ] as const)
      await page.getByLabel(label, { exact: true }).fill(value);
    for (const box of await page.locator('#registration-form input[type="checkbox"][required]').all())
      await box.check();
    await page.locator('input[name="media"][value="yes"]').check();
    await page.getByRole("button", { name: /^Sign and submit/ }).click();
    await expect(page.locator("#signed-result")).toBeVisible({ timeout: 30000 });
  }
  await signOnce();

  const signed = await db.query(
    `SELECT k.name, w.signing_group, w.snapshot->'registration' AS r, w.snapshot->'evidence'->'alsoSignedFor' AS also,
      octet_length(w.pdf) AS pdf_bytes
    FROM club_kid k JOIN club_signed_waiver w ON w.kid_id=k.id WHERE k.contact_phone=$1 ORDER BY k.created_at`,
    ["+230 5722 3344"],
  );
  expect(signed.rows.map((row) => row.name)).toEqual(names);
  // One signing, one signature, one set of guardians — three sealed records.
  expect(new Set(signed.rows.map((row) => row.signing_group)).size).toBe(1);
  expect(signed.rows.every((row) => row.pdf_bytes > 1000)).toBe(true);
  expect(signed.rows.map((row) => row.r.sessionsPerWeek)).toEqual(["2", "1", "2"]);
  expect(signed.rows.map((row) => row.r.medicalNotes)).toEqual(["", "", "Peanut allergy"]);
  expect(signed.rows.map((row) => row.r.signerName)).toEqual(Array(3).fill("Sibling Parent"));
  expect(signed.rows[0].also).toEqual(["Bo Sibling", "Cy Sibling"]);
  // The download is one file holding every child's waiver.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Download signed waiver/ }).click();
  const pdf = await PDFDocument.load(await readFile(await (await download).path()));
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
  const audit = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download signature record", exact: true }).click();
  const records = JSON.parse(await readFile(await (await audit).path(), "utf8"));
  expect(records.records.map((record: any) => record.child)).toEqual(names);

  // Reopening the link brings the whole family back, ready for a fourth.
  await page.getByRole("button", { name: "Edit details, add a duckie, sign again", exact: true }).click();
  await expect(page.locator("[data-child]")).toHaveCount(3);
  await expect(page.getByLabel("Child’s full name · duckie 2", { exact: true })).toHaveValue("Bo Sibling");
  await expect(page.getByLabel("Training rhythm · duckie 2", { exact: true })).toHaveValue("1");
  // A child whose waiver is signed stays on the form; only the club archives one.
  await expect(page.locator("[data-remove-child]:not([hidden])")).toHaveCount(0);
  await page.getByRole("button", { name: "Add another child", exact: true }).click();
  await fillChildren(["Dee Sibling"], 3);
  await signOnce();
  const after = await db.query(
    `SELECT k.name, w.signing_group FROM club_kid k JOIN club_signed_waiver w ON w.kid_id=k.id
    WHERE k.contact_phone=$1 AND w.signed_at=(SELECT max(signed_at) FROM club_signed_waiver)
    ORDER BY k.created_at`,
    ["+230 5722 3344"],
  );
  expect(after.rows.map((row) => row.name)).toEqual([...names, "Dee Sibling"]);
  expect(new Set(after.rows.map((row) => row.signing_group)).size).toBe(1);
  // The corrected signing replaces the first; the club keeps both.
  expect((await db.query("SELECT * FROM club_signed_waiver")).rowCount).toBe(7);
  expect(errors).toEqual([]);
});

// Coming back later for a duckie the family missed: the signed page leads to a
// fresh sign-up that already knows who the parent is.
test("the signed page leads back to a fresh sign-up that remembers the family", async ({
  page,
}) => {
  const join = page.locator("[data-join][data-ready]");
  await page.goto("/join", { waitUntil: "domcontentloaded" });
  await expect(join.locator("[data-join-again]")).toBeHidden();
  await join.getByLabel("Kid's name").fill("Elder Sibling");
  await join.getByLabel("Parent / guardian").fill("Later Parent");
  await join.getByLabel("WhatsApp number").fill("+230 5733 4455");
  await join.getByRole("button", { name: "Start the registration" }).click();
  await page.waitForURL(/\/register#token=/);
  await expect(page.locator("#registration-form")).toBeVisible();
  await page.getByLabel("Child’s full name", { exact: true }).fill("Elder Sibling");
  await page.getByLabel("Date of birth", { exact: true }).fill("2016-05-04");
  await page.getByLabel("Training rhythm", { exact: true }).selectOption("1");
  for (const [label, value] of [
    ["Full name · guardian 1", "Later Parent"],
    ["Relationship · guardian 1", "Mother"],
    ["Phone · guardian 1", "+230 5733 4455"],
    ["Email · guardian 1", "later.parent@example.com"],
    ["Type your full name to sign", "Later Parent"],
  ] as const)
    await page.getByLabel(label, { exact: true }).fill(value);
  for (const box of await page.locator('#registration-form input[type="checkbox"][required]').all())
    await box.check();
  await page.locator('input[name="media"][value="yes"]').check();
  await page.getByRole("button", { name: /^Sign and submit/ }).click();
  await expect(page.locator("#signed-result")).toBeVisible({ timeout: 30000 });

  await page.getByRole("link", { name: /^Register another child/ }).click();
  await page.waitForURL(/\/join$/);
  await expect(join.locator("[data-join-again]")).toBeVisible();
  await expect(join.getByLabel("Parent / guardian")).toHaveValue("Later Parent");
  await expect(join.getByLabel("WhatsApp number")).toHaveValue("+230 5733 4455");
  await expect(join.getByLabel("Kid's name")).toHaveValue("");
});

test("younger children can sign up with parent guidance and a private organiser age warning", async ({ request, page }, testInfo) => {
  const invitation = await issue(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(invitation.url);
  await expect(page.locator("#registration-form")).toBeVisible();
  const birthday = page.getByLabel("Date of birth", { exact: true });
  const warning = page.locator("[data-age-warning]");
  const youngerBirthday = new Date();
  youngerBirthday.setUTCFullYear(youngerBirthday.getUTCFullYear() - 6);
  const dob = youngerBirthday.toISOString().slice(0, 10);
  await birthday.fill(dob);
  await expect(warning).toBeVisible();
  await expect(warning).toContainText("Younger children can join");
  await expect(birthday).toHaveAccessibleDescription(/discuss their readiness and support needs/);
  await expect(birthday).not.toHaveAttribute("aria-invalid");
  await warning.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("parent-age-warning.png") });
  await birthday.fill("2017-10-01");
  await expect(warning).toBeHidden();
  await expect(birthday).not.toHaveAttribute("aria-describedby");
  await birthday.fill(dob);
  await page.getByLabel("Training rhythm", { exact: true }).selectOption("2");
  for (const [label, value] of [
    ["Full name · guardian 1", "Test Guardian"],
    ["Relationship · guardian 1", "Parent"],
    ["Phone · guardian 1", "+230 5555 1234"],
    ["Email · guardian 1", "guardian@example.com"],
    ["Type your full name to sign", "Test Guardian"],
  ]) await page.getByLabel(label, { exact: true }).fill(value);
  for (const box of await page.locator('#registration-form input[type="checkbox"][required]').all()) await box.check();
  await page.locator('input[name="media"][value="no"]').check();
  await page.locator("#submit-registration").click();
  await expect(page.locator("#signed-result")).toBeVisible({ timeout: 20000 });
  const signed = (await db.query("SELECT snapshot FROM club_signed_waiver WHERE kid_id=$1", [kidId])).rows[0].snapshot;
  expect(signed.registration.dateOfBirth).toBe(dob);
  expect(signed.version).toBe(WAIVER_VERSION);
  expect(signed.policy.acknowledgements.join(" ")).toContain("Younger children can join");
  expect(signed.policy.acknowledgements.join(" ")).not.toContain("at least 7 years old");
  await page.getByRole("button", { name: "Edit details, add a duckie, sign again", exact: true }).click();
  await expect(warning).toBeVisible();

  // Organisers see the age flag without opening the row, can filter for it,
  // and get the readiness warning when they open the child's details.
  await signIn(page.request, organiser);
  await page.goto("/#our-duckies");
  const row = page.locator(".duckie-row").filter({ hasText: "Test Surfer" });
  await expect(row.locator("summary")).toContainText("Under 7 · discuss readiness");
  await page.getByLabel("Show", { exact: true }).selectOption("younger");
  await expect(row).toBeVisible();
  await row.locator("summary").click();
  await expect(row.getByText(/Under 7: Test Surfer is 6/)).toBeVisible();
  await expect(row.getByText(/Discuss readiness and support needs with the family/)).toBeVisible();
  await row.getByText(/Under 7: Test Surfer is 6/).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("organiser-age-warning.png") });
});

test("administrative birth-date corrections preserve the signature and update age everywhere", async ({ request, page }) => {
  const invitation = await issue(request);
  expect((await complete(request, invitation.headers, { ...payload(), dateOfBirth: "2018-11-07" })).status()).toBe(201);
  const before = (await db.query("SELECT * FROM club_signed_waiver WHERE kid_id=$1", [kidId])).rows[0];
  const correction = { kidId, expectedDate: "2018-11-07", dateOfBirth: "2019-11-07", actorEmail: owner, reason: "Correct the birth year supplied at registration." };
  await expect(correctBirthDate({ ...correction, actorEmail: "member@example.com" }, true)).rejects.toThrow("organiser");
  await expect(correctBirthDate({ ...correction, expectedDate: "2017-11-07" }, true)).rejects.toThrow("has changed");
  expect((await correctBirthDate(correction)).changed).toBe(false);
  expect((await db.query("SELECT * FROM club_birth_date_correction")).rowCount).toBe(0);
  expect((await correctBirthDate(correction, true)).changed).toBe(true);
  expect((await correctBirthDate(correction, true)).changed).toBe(false);
  expect((await db.query("SELECT * FROM club_birth_date_correction")).rowCount).toBe(1);
  await expect(db.query("UPDATE club_birth_date_correction SET reason='replacement'")).rejects.toThrow("append-only");
  const after = (await db.query("SELECT * FROM club_signed_waiver WHERE id=$1", [before.id])).rows[0];
  expect(after).toEqual(before);
  const roster = await (await request.get("/api/kids")).json();
  expect(roster.kids[0].registration.dateOfBirth).toBe("2019-11-07");
  expect(roster.kids[0].age).toBe(6);
  expect(roster.kids[0].birthDateCorrection).toMatchObject({ previousDate: "2018-11-07", dateOfBirth: "2019-11-07", actorEmail: owner });
  const info = await (await request.get("/api/registration", { headers: invitation.headers })).json();
  expect(info.signed.children[0].registration.dateOfBirth).toBe("2019-11-07");
  const download = await request.get("/api/registration/document", { headers: invitation.headers });
  expect((await download.body()).equals(before.pdf)).toBe(true);
  await db.query("INSERT INTO club_cup_entry(kid_id,edition,member,contact_name,contact_phone) VALUES ($1,'cup-vol-2',true,'Test Parent','12345678')", [kidId]);
  expect((await (await request.get("/api/cup/lineup")).json()).surfers[0].age).toBe(6);
  expect((await readEntrants())[0].age).toBe(6);
  await signIn(page.request, organiser);
  await page.goto("/#our-duckies");
  const row = page.locator(".duckie-row").filter({ hasText: "Test Surfer" });
  await row.locator("summary").click();
  await expect(row.getByText(/Club corrected 2018-11-07 to 2019-11-07/)).toBeVisible();
  await expect(row.getByText(/The original signed waiver is unchanged/)).toBeVisible();
  // A later guardian signature replaces the administrative override and
  // leaves both the earlier signed record and the correction history intact.
  expect((await complete(request, invitation.headers, { ...payload(), dateOfBirth: "2019-11-08", supersedes: info.signed.id, kidId })).status()).toBe(201);
  const refreshed = await (await request.get("/api/kids")).json();
  expect(refreshed.kids[0].registration.dateOfBirth).toBe("2019-11-08");
  expect(refreshed.kids[0].birthDateCorrection).toBeNull();
  expect((await db.query("SELECT * FROM club_birth_date_correction")).rowCount).toBe(1);
});


test("registration commits private parent profiles and photos; admin table refreshes and authenticated edits are preserved", async ({ request, playwright, page }) => {
  const invitation = await issue(request);
  const guest = await playwright.request.newContext({ baseURL: origin });
  const parent = await playwright.request.newContext({ baseURL: origin });
  try {
    const photo = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#e9a366" } }).png().toBuffer();
    for (const email of ["guardian@example.com", "second@example.com", "removed@example.com"]) {
      const upload = await guest.put(`/api/registration/parent-photo?email=${email}`, { headers: { ...invitation.headers, "content-type": "image/png" }, data: photo });
      expect(upload.status()).toBe(200);
    }
    expect((await db.query("SELECT * FROM club_parent_profile")).rowCount).toBe(0);
    expect((await complete(guest, invitation.headers, { ...payload(), waiverAccepted: false })).status()).toBe(400);
    expect((await db.query("SELECT * FROM club_parent_profile")).rowCount).toBe(0);
    await page.context().addCookies((await request.storageState()).cookies);
    await page.goto("/admin/parents");
    await page.getByRole("searchbox", { name: "Find a parent or duckie" }).fill("guardian@example.com");
    await expect(page.getByText("No parents match your search.")).toBeVisible();
    const signed = await complete(guest, invitation.headers);
    expect(signed.status()).toBe(201);
    const group = await signed.json();
    const row = page.getByRole("row").filter({ hasText: "guardian@example.com" });
    await expect(row).toContainText("Test Guardian", { timeout: 12000 });
    await expect(row).toContainText("Test Surfer");
    await expect(row).toContainText("Father");
    await expect(row.getByRole("img")).toBeVisible();
    expect(await row.getByRole("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect((await db.query("SELECT email FROM club_parent_profile ORDER BY email")).rows.map(row => row.email)).toEqual(["guardian@example.com", "second@example.com"]);
    expect((await db.query("SELECT * FROM club_registration_parent_photo")).rowCount).toBe(0);
    expect((await guest.get("/api/admin/parents")).status()).toBe(401);
    expect((await guest.get("/api/parents/photo?email=guardian@example.com")).status()).toBe(401);
    const corrected = payload(); corrected.guardians[0].phone = "+230 5555 1111";
    const correction = submission({ ...corrected, supersedes: group.id });
    correction.children[0].kidId = kidId;
    const correctedResponse = await guest.post("/api/registration", { headers: invitation.headers, data: correction });
    expect(correctedResponse.status()).toBe(201);
    await expect(row).toContainText("+230 5555 1111", { timeout: 12000 });
    await signIn(parent, "guardian@example.com");
    expect((await parent.get("/api/admin/parents")).status()).toBe(403);
    expect((await parent.get("/api/parents/photo?email=second@example.com")).status()).toBe(200);
    expect((await parent.put("/api/parents/photo?email=second@example.com", { headers: { origin, "content-type": "image/png" }, data: photo })).status()).toBe(403);
    expect((await parent.get("/api/parents/photo?email=outsider@example.com")).status()).toBe(403);
    expect((await parent.get("/api/parents/photo")).status()).toBe(200);
    expect((await parent.put("/api/parents/profile", { headers: { origin }, data: { name: "Parent chosen name", phone: "+230 5555 2222" } })).status()).toBe(200);
    expect((await parent.put("/api/parents/photo", { headers: { origin, "content-type": "image/png" }, data: photo })).status()).toBe(200);
    const before = (await db.query("SELECT photo_updated_at FROM club_parent_profile WHERE email='guardian@example.com'")).rows[0];
    expect((await guest.put("/api/registration/parent-photo?email=guardian@example.com", { headers: { ...invitation.headers, "content-type": "image/png" }, data: photo })).status()).toBe(200);
    Object.assign(correction, { supersedes: (await correctedResponse.json()).id });
    expect((await guest.post("/api/registration", { headers: invitation.headers, data: correction })).status()).toBe(201);
    const saved = (await db.query("SELECT name,phone,photo_updated_at FROM club_parent_profile WHERE email='guardian@example.com'")).rows[0];
    expect(saved).toEqual({ name: "Parent chosen name", phone: "+230 5555 2222", photo_updated_at: before.photo_updated_at });
    await page.getByRole("searchbox").fill("");
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(row).toContainText("Parent chosen name", { timeout: 12000 });
    await page.screenshot({ path: "test-results/parents-admin-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/parents-admin-mobile.png", fullPage: true });
  } finally { await guest.dispose(); await parent.dispose(); }
});

test("parent backfill restores older signed guardians without changing existing profiles or waivers", async ({ request }) => {
  const invitation = await issue(request);
  expect((await complete(request, invitation.headers)).status()).toBe(201);
  const before = (await db.query("SELECT * FROM club_signed_waiver WHERE kid_id=$1", [kidId])).rows;
  await db.query("DELETE FROM club_parent_profile WHERE email='guardian@example.com'");
  await db.query("UPDATE club_parent_profile SET name='Parent edited name',phone='12345678',registration_link_id=NULL WHERE email='second@example.com'");
  const backfill = await readFile("prisma/migrations/20260920180000_parent_profile_backfill/migration.sql", "utf8");
  await db.query(backfill);
  await db.query(backfill);
  const profiles = (await db.query("SELECT email,name,phone,registration_link_id FROM club_parent_profile ORDER BY email")).rows;
  expect(profiles).toHaveLength(2);
  expect(profiles[0]).toMatchObject({ email: "guardian@example.com", name: "Test Guardian", phone: "+230 5555 1234", registration_link_id: before[0].link_id });
  expect(profiles[1]).toMatchObject({ email: "second@example.com", name: "Parent edited name", phone: "12345678", registration_link_id: null });
  expect((await db.query("SELECT * FROM club_signed_waiver WHERE kid_id=$1", [kidId])).rows).toEqual(before);
});

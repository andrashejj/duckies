import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { verify, createHash } from "node:crypto";
import pg from "pg";
import { PDFDocument } from "pdf-lib";
import { signIn } from "./auth-helpers";
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
  return request.post("/api/registration", { headers, data });
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
    'TRUNCATE club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit CASCADE',
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
});

test("individual links are hashed, replaceable, revocable, expiring, and do not expose existing family data", async ({
  request,
  playwright,
}) => {
  await pay("unpaid");
  expect(
    (
      await request.post(`/api/kids/${kidId}/link`, { headers: { origin } })
    ).status(),
  ).toBe(409);
  await pay("paid");
  const first = await issue(request);
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
    { dateOfBirth: "2021-01-01" }, // under the minimum age
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
          data: { ...payload(), ...patch },
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
  const corrected = await complete(request, invitation.headers, {
    ...payload(),
    dateOfBirth: "2018-02-03",
    supersedes: first.id,
  });
  expect(corrected.status()).toBe(201);
  expect(
    (
      await complete(request, invitation.headers, { ...payload(), supersedes: first.id })
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
  await page.getByLabel("Training rhythm", { exact: true }).selectOption("2");
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
  await page
    .getByRole("button", { name: /^Sign and submit/ })
    .click();
  await expect(page.locator("#signed-result")).toBeVisible({ timeout: 20000 });
  // Corrections reopen the signed details through the same link.
  await page.getByRole("button", { name: "Edit details and sign again", exact: true }).click();
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
  await page
    .getByRole("button", { name: "Generate registration link", exact: true })
    .click();
  await expect(page.getByText(/Record the September 2026 semester payment first/)).toBeVisible();
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

import { test, expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";
import { signIn } from "./auth-helpers";
import { WAIVER_VERSION } from "../src/lib/registration/policy";
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329";
const owner = "andras@hejj.xyz";
let kidId: string;
const newTerm = {
  id: "2027-S1",
  label: "January 2027 semester",
  startsOn: "2027-01-11",
  endsOn: "2027-06-30",
  childFeeMur: 3500,
  familyFeeMur: 5500,
};
async function png() {
  return sharp({
    create: { width: 800, height: 600, channels: 3, background: "#07c9b6" },
  })
    .png()
    .withMetadata({ exif: { IFD0: { Artist: "Private GPS metadata" } } })
    .toBuffer();
}
const registration = () => ({
  version: WAIVER_VERSION,
  childName: "Photo Duckie",
  dateOfBirth: "2018-01-01",
  guardians: [
    {
      name: "Parent Example",
      relationship: "Mother",
      phone: "+230 5555 1234",
      email: "parent@example.com",
    },
  ],
  emergencyName: "Emergency Example",
  emergencyRelationship: "Aunt",
  emergencyPhone: "+230 5555 9999",
  medicalNotes: "",
  sessionsPerWeek: "2",
  media: "no",
  parentInWater: true,
  swimming: true,
  reef: true,
  gear: true,
  waiverAccepted: true,
  electronicConsent: true,
  signerName: "Parent Example",
  signature: [],
});
// Registration links only open once the semester is paid.
async function pay(request: APIRequestContext, term = "2026-S2") {
  const result = await request.post(`/api/kids/${kidId}/payment`, {
    headers: { origin },
    data: { term, status: "paid", amountMur: null, note: "Paid before registration" },
  });
  expect(result.status()).toBe(201);
}
test.beforeEach(async ({ request }) => {
  await db.query(
    'TRUNCATE club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit,club_semester CASCADE',
  );
  await db.query(
    "INSERT INTO club_semester(id,label,child_fee_mur,family_fee_mur,is_current) VALUES('2026-S2','September 2026 semester',3000,5000,true)",
  );
  await db.query(
    "INSERT INTO club_member(email,role) VALUES($1,'organiser'),('staff@example.com','organiser'),('member@example.com','member')",
    [owner],
  );
  await signIn(request, owner);
  kidId = (
    await (
      await request.post("/api/kids", {
        headers: { origin },
        data: { name: "Photo Duckie" },
      })
    ).json()
  ).kid.id;
});
test.afterAll(async () => {
  await db.query("UPDATE club_semester SET is_current=false WHERE is_current");
  await db.query("UPDATE club_semester SET is_current=true WHERE id='2026-S2'");
  await db.end();
});

test("semester payments are separate; switching the default never moves historical payments", async ({
  request,
}) => {
  const pay = (term: string, status = "paid") =>
    request.post(`/api/kids/${kidId}/payment`, {
      headers: { origin },
      data: {
        term,
        status,
        amountMur: 3000,
        note: "Received for selected semester",
      },
    });
  expect((await pay("2026-S2")).status()).toBe(201);
  expect(
    (
      await request.post("/api/semesters", {
        headers: { origin },
        data: newTerm,
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.patch("/api/semesters", {
        headers: { origin },
        data: { id: newTerm.id },
      })
    ).status(),
  ).toBe(200);
  let roster = await (await request.get("/api/kids")).json();
  expect(roster.term.id).toBe(newTerm.id);
  expect(roster.kids[0].payment).toBeNull();
  expect((await pay(newTerm.id)).status()).toBe(201);
  expect((await pay("2026-S2", "unpaid")).status()).toBe(201);
  expect(
    (await (await request.get(`/api/kids?term=${newTerm.id}`)).json()).kids[0]
      .payment.status,
  ).toBe("paid");
  expect(
    (await (await request.get("/api/kids?term=2026-S2")).json()).kids[0].payment
      .status,
  ).toBe("unpaid");
  const history = await (
    await request.get(`/api/kids/${kidId}/records`)
  ).json();
  expect(history.payments).toHaveLength(3);
  expect((await pay("unknown")).status()).toBe(400);
  expect(
    (
      await request.post(`/api/kids/${kidId}/payment`, {
        headers: { origin },
        data: { status: "paid", amountMur: null, note: "Missing semester" },
      })
    ).status(),
  ).toBe(400);
  expect((await request.get("/api/kids?term=unknown")).status()).toBe(400);
});

test("semester management remains owner-only and rejects invalid or duplicate semesters", async ({
  request,
  playwright,
}) => {
  const staff = await playwright.request.newContext({ baseURL: origin });
  await signIn(staff, "staff@example.com");
  expect((await staff.get("/api/semesters")).status()).toBe(200);
  for (const method of ["POST", "PATCH"])
    expect(
      (
        await staff.fetch("/api/semesters", {
          method,
          headers: { origin },
          data: newTerm,
        })
      ).status(),
    ).toBe(403);
  expect(
    (
      await request.post("/api/semesters", {
        headers: { origin: "https://outside.example" },
        data: newTerm,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/semesters", {
        headers: { origin },
        data: { ...newTerm, endsOn: "2026-01-01" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/semesters", {
        headers: { origin },
        data: newTerm,
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.post("/api/semesters", {
        headers: { origin },
        data: newTerm,
      })
    ).status(),
  ).toBe(409);
  await staff.dispose();
});

test("organiser photos are re-encoded, private, replaceable and removable", async ({
  request,
  playwright,
}) => {
  const upload = await request.put(`/api/kids/${kidId}/photo`, {
    headers: { origin, "Content-Type": "image/png" },
    data: await png(),
  });
  expect(upload.status()).toBe(200);
  const photo = await request.get(`/api/kids/${kidId}/photo`);
  expect(photo.headers()["cache-control"]).toContain("no-store");
  expect(photo.headers()["content-type"]).toBe("image/webp");
  const metadata = await sharp(await photo.body()).metadata();
  expect(metadata.width).toBe(512);
  expect(metadata.height).toBe(512);
  expect(metadata.exif).toBeUndefined();
  expect(
    (await (await request.get("/api/kids")).json()).kids[0].photoVersion,
  ).toBeTruthy();
  const guest = await playwright.request.newContext({ baseURL: origin });
  expect((await guest.get(`/api/kids/${kidId}/photo`)).status()).toBe(401);
  await signIn(guest, "member@example.com");
  expect((await guest.get(`/api/kids/${kidId}/photo`)).status()).toBe(403);
  expect(
    (
      await guest.put(`/api/kids/${kidId}/photo`, {
        headers: { origin },
        data: await png(),
      })
    ).status(),
  ).toBe(403);
  expect((await (await guest.get("/api/kids")).json()).kids[0]).toEqual({
    id: kidId,
    name: "Photo Duckie",
  });
  expect(
    (
      await request.delete(`/api/kids/${kidId}/photo`, { headers: { origin } })
    ).status(),
  ).toBe(200);
  expect((await request.get(`/api/kids/${kidId}/photo`)).status()).toBe(404);
  await guest.dispose();
});

test("photo uploads reject disguised content, malformed files, oversized inputs and cross-origin requests", async ({
  request,
}) => {
  const route = `/api/kids/${kidId}/photo`;
  expect(
    (
      await request.put(route, {
        headers: { origin, "Content-Type": "image/png" },
        data: '<svg onload="alert(1)"></svg>',
      })
    ).status(),
  ).toBe(415);
  expect(
    (
      await request.put(route, {
        headers: { origin },
        data: Buffer.from([255, 216, 255, 0, 0]),
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.put(route, {
        headers: { origin },
        data: Buffer.alloc(4 * 1024 * 1024 + 1),
      })
    ).status(),
  ).toBe(413);
  expect(
    (
      await request.put(route, {
        headers: { origin: "https://outside.example" },
        data: await png(),
      })
    ).status(),
  ).toBe(403);
  expect((await request.get(route)).status()).toBe(404);
});

test("guardian photo is staged until signature; new-semester views retain the profile and waiver", async ({
  request,
  playwright,
}) => {
  await pay(request);
  const invite = await (
    await request.post(`/api/kids/${kidId}/link`, { headers: { origin } })
  ).json();
  const token = new URLSearchParams(new URL(invite.url).hash.slice(1)).get(
    "token",
  );
  const headers = { origin, Authorization: `Bearer ${token}` };
  const guest = await playwright.request.newContext({ baseURL: origin });
  expect(
    (
      await guest.put("/api/registration/photo", { headers, data: await png() })
    ).status(),
  ).toBe(200);
  expect((await request.get(`/api/kids/${kidId}/photo`)).status()).toBe(404);
  expect(
    (
      await guest.post("/api/registration", { headers, data: registration() })
    ).status(),
  ).toBe(201);
  expect((await request.get(`/api/kids/${kidId}/photo`)).status()).toBe(200);
  expect(
    (await db.query("SELECT * FROM club_registration_photo")).rowCount,
  ).toBe(0);
  // The signed link stays open for corrections: a replacement photo is staged
  // again and only reaches the profile with the corrected signature.
  const before = (await db.query("SELECT updated_at FROM club_kid_photo")).rows[0].updated_at;
  expect(
    (
      await guest.put("/api/registration/photo", { headers, data: await png() })
    ).status(),
  ).toBe(200);
  expect((await db.query("SELECT updated_at FROM club_kid_photo")).rows[0].updated_at).toEqual(before);
  const info = await (await guest.get("/api/registration", { headers })).json();
  expect(info.signed.hasPhoto).toBe(true);
  expect(
    (
      await guest.post("/api/registration", {
        headers,
        data: { ...registration(), supersedes: info.signed.id },
      })
    ).status(),
  ).toBe(201);
  expect((await db.query("SELECT updated_at FROM club_kid_photo")).rows[0].updated_at).not.toEqual(before);
  await request.post("/api/semesters", { headers: { origin }, data: newTerm });
  const roster = await (
    await request.get(`/api/kids?term=${newTerm.id}`)
  ).json();
  expect(roster.kids[0].registration.guardians[0].name).toBe("Parent Example");
  expect(roster.kids[0].waiverId).toBeTruthy();
  expect(roster.kids[0].payment).toBeNull();
  expect(roster.kids[0].photoVersion).toBeTruthy();
  expect(
    (
      await request.post(`/api/kids/${kidId}/link?term=${newTerm.id}`, {
        headers: { origin },
      })
    ).status(),
  ).toBe(409);
  await pay(request, newTerm.id);
  const next = await (
    await request.post(`/api/kids/${kidId}/link?term=${newTerm.id}`, {
      headers: { origin },
    })
  ).json();
  const newToken = new URLSearchParams(new URL(next.url).hash.slice(1)).get(
    "token",
  );
  const nextInfo = await (
    await guest.get("/api/registration", {
      headers: { Authorization: `Bearer ${newToken}` },
    })
  ).json();
  expect(nextInfo.termLabel).toBe(newTerm.label);
  expect(nextInfo.signed).toBeNull(); // a fresh link never prefills earlier records
  await guest.dispose();
});

test("revoked photo invitations cannot mutate a profile", async ({
  request,
  playwright,
}) => {
  await pay(request);
  const invite = await (
    await request.post(`/api/kids/${kidId}/link`, { headers: { origin } })
  ).json();
  const token = new URLSearchParams(new URL(invite.url).hash.slice(1)).get(
    "token",
  );
  await request.delete(`/api/kids/${kidId}/link`, { headers: { origin } });
  const guest = await playwright.request.newContext({ baseURL: origin });
  expect(
    (
      await guest.put("/api/registration/photo", {
        headers: { origin, Authorization: `Bearer ${token}` },
        data: await png(),
      })
    ).status(),
  ).toBe(404);
  expect((await db.query("SELECT * FROM club_kid_photo")).rowCount).toBe(0);
  await guest.dispose();
});

test("mobile owner creates a semester, records payment and uploads an avatar", async ({
  page,
}) => {
  await signIn(page.request, owner);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#our-duckies", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-members]")).toBeVisible();
  await page.getByText("Add a semester", { exact: true }).click();
  for (const [label, value] of [
    ["Semester ID", newTerm.id],
    ["Semester name", newTerm.label],
    ["Start date (optional)", newTerm.startsOn],
    ["End date (optional)", newTerm.endsOn],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: /^Create semester/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Payment semester", exact: true }),
  ).toHaveValue(newTerm.id);
  await page
    .getByRole("button", {
      name: "Make this the current semester",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Payment semester", exact: true }),
  ).toHaveValue(newTerm.id);
  await page.locator(".duckie-summary").click();
  await page
    .getByRole("button", { name: "Update payment", exact: true })
    .click();
  await page
    .getByLabel("Payment note / reference", { exact: true })
    .fill("Semester payment");
  await page.getByRole("button", { name: /^Save payment status/ }).click();
  await expect(
    page.getByText("Paid · amount not recorded · Semester payment", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Profile photo", { exact: true })
    .setInputFiles({
      name: "profile.png",
      mimeType: "image/png",
      buffer: await png(),
    });
  await page.getByRole("button", { name: "Upload photo", exact: true }).click();
  await expect(page.getByAltText("Photo Duckie's profile photo")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Payment semester", exact: true })
    .selectOption("2026-S2");
  await expect(
    page.getByText("Unpaid · no payment recorded for this semester", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByAltText("Photo Duckie's profile photo")).toBeVisible();
  await page
    .locator("[data-members]")
    .screenshot({ path: "test-results/semester-photo-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

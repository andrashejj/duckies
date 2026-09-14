import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createPrismaClient } from "../src/lib/prisma-factory";
import { getDatabase } from "../src/lib/server/db";
import { codeFor, signIn } from "./auth-helpers";

const db = getDatabase();
const prisma = createPrismaClient();
const origin = "http://127.0.0.1:4329";
const organiser = "organiser@example.com";
let productId: string;
let dropId: string;

function payload(email = "shopper@example.com", quantity = 1) {
  return { requestKey: randomUUID(), customer: { name: "Test Shopper", email },
    lines: [{ productId, quantity, size: "Kids 8" }] };
}
async function reserve(request: APIRequestContext, data = payload()) {
  return request.post("/api/reserve", { headers: { origin }, data });
}
async function order(request: APIRequestContext, email = "shopper@example.com") {
  const response = await reserve(request, payload(email));
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  return body as { orderId: string; guestToken: string; emailSent: boolean; whatsappUrl: string };
}

test.beforeEach(async () => {
  await db.query('TRUNCATE club_kid, club_member, "user", "session", account, verification, "rateLimit", "Drop", "Product", "Order", shop_request_limit CASCADE');
  await db.query("INSERT INTO club_member (email, role) VALUES ($1, 'organiser'), ('parent@example.com', 'member')", [organiser]);
  const drop = await prisma.drop.create({ data: { slug: "test-drop", name: "Test Drop", status: "LIVE" } });
  dropId = drop.id;
  const product = await prisma.product.create({ data: {
    sku: "TEST-TEE", slug: "test-tee", name: "Test Surf Tee", kind: "Tee", description: "A test surf tee.",
    priceCents: 85000, currency: "MUR", category: "APPAREL", sizes: ["Kids 8", "Adult M"],
    imageUrl: "/media/shop/tee-cream.png", imageAlt: "Cream surf tee", stock: 5, dropId,
  } });
  productId = product.id;
});
test.afterAll(async () => { await prisma.$disconnect(); await db.end(); });

test("only active products in open drops are public and reservable", async ({ request }) => {
  expect(await (await request.get("/shop")).text()).toContain("Test Surf Tee");
  for (const state of [
    { status: "DRAFT" as const }, { status: "CLOSED" as const },
    { status: "LIVE" as const, opensAt: new Date(Date.now() + 3600000) },
    { status: "LIVE" as const, opensAt: null, closesAt: new Date(Date.now() - 3600000) },
  ]) {
    await prisma.drop.update({ where: { id: dropId }, data: state });
    expect(await (await request.get("/shop")).text()).not.toContain("Test Surf Tee");
    expect((await request.get("/shop/test-tee")).status()).toBe(404);
    expect((await reserve(request)).status()).toBe(400);
  }
  await prisma.drop.update({ where: { id: dropId }, data: { status: "LIVE", opensAt: null, closesAt: null } });
  await prisma.product.update({ where: { id: productId }, data: { active: false } });
  expect((await request.get("/shop/test-tee")).status()).toBe(404);
  expect((await reserve(request)).status()).toBe(400);
});

test("guest reservation validates size, snapshots server prices, and protects receipt links", async ({ request }) => {
  const invalid = payload(); invalid.lines[0].size = "Not a size";
  expect((await reserve(request, invalid)).status()).toBe(400);
  const data = { ...payload(), priceCents: 1, totalCents: 1 };
  const result = await reserve(request, data);
  expect(result.status()).toBe(200);
  const saved = await result.json();
  const stored = await prisma.order.findUniqueOrThrow({ where: { id: saved.orderId }, include: { items: true } });
  expect(stored.totalCents).toBe(85000);
  expect(stored.items[0].priceCentsSnapshot).toBe(85000);
  expect(stored.items[0].stockReserved).toBe(true);
  expect(saved.whatsappUrl).not.toContain("text=");
  expect((await request.get(`/orders/${saved.orderId}?t=wrong`)).status()).toBe(404);
  const receipt = await request.get(`/orders/${saved.orderId}?t=${saved.guestToken}`);
  expect(receipt.status()).toBe(200);
  expect(await receipt.text()).toContain("Test Surf Tee");
  expect(await (await request.get("/shop/test-tee")).text()).toContain("Test Drop");
  expect(receipt.headers()["cache-control"]).toContain("no-store");
  expect(receipt.headers()["referrer-policy"]).toBe("no-referrer");
  expect(receipt.headers()["x-robots-tag"]).toContain("noindex");
});

test("concurrent reservations never oversell, duplicate lines are aggregated, and retries are idempotent", async ({ request }) => {
  const duplicate = payload(undefined, 3); duplicate.lines.push({ ...duplicate.lines[0] });
  expect((await reserve(request, duplicate)).status()).toBe(400);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(5);
  const responses = await Promise.all([reserve(request, payload(undefined, 4)), reserve(request, payload(undefined, 4))]);
  expect(responses.map(response => response.status()).sort()).toEqual([200, 400]);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(1);
  const repeat = payload();
  const [first, retry] = await Promise.all([reserve(request, repeat), reserve(request, repeat)]);
  expect(first.status()).toBe(200); expect(retry.status()).toBe(200);
  expect((await first.json()).orderId).toBe((await retry.json()).orderId);
  expect(await prisma.order.count()).toBe(2);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(0);
  const changed = { ...repeat, customer: { ...repeat.customer, name: "Changed" } };
  expect((await reserve(request, changed)).status()).toBe(400);
});

test("shop customers use shared sign-in but cannot access the roster, admin, or someone else's orders", async ({ request, page }) => {
  const own = await order(request);
  const other = await order(request, "other-shopper@example.com");
  await signIn(page.request, "shopper@example.com");
  expect((await page.request.get("/api/kids")).status()).toBe(401);
  expect((await page.request.get("/admin")).status()).toBe(403);
  expect((await page.request.get("/members")).status()).toBe(403);
  for (const route of ["/api/admin/products", "/api/admin/drops", `/api/admin/orders/${own.orderId}/paid`]) {
    expect((await page.request.post(route, { data: {}, headers: { origin } })).status()).toBe(403);
  }
  await page.goto("/account/orders", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "View reservation" })).toHaveAttribute("href", `/orders/${own.orderId}?t=${own.guestToken}`);
  expect(await page.content()).not.toContain(other.orderId);
  expect(await prisma.user.count({ where: { email: "shopper@example.com" } })).toBe(1);
  expect((await db.query('SELECT to_regclass(\'public."User"\') AS legacy')).rows[0].legacy).toBeNull();
});

test("organiser session governs catalogue administration, stock cancellation, payment and notes", async ({ request }) => {
  const saved = await order(request);
  await signIn(request, organiser);
  for (const route of ["/admin", "/admin/orders", "/admin/products", "/admin/drops", "/admin/customers"]) {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  expect((await request.patch(`/api/admin/products/${productId}`, { data: { priceCents: 95000 }, headers: { origin: "https://outside.example" } })).status()).toBe(403);
  expect((await request.patch(`/api/admin/products/${productId}`, { data: { priceCents: 95000 }, headers: { origin } })).status()).toBe(200);
  expect((await request.post(`/api/admin/orders/${saved.orderId}/transition`, { data: { to: "CONFIRMED", adminNote: "INTERNAL-TEST-NOTE" }, headers: { origin } })).status()).toBe(200);
  const mail = await readFile(process.env.DUCKIES_TEST_MAIL_FILE!, "utf8");
  expect(mail).not.toContain("INTERNAL-TEST-NOTE");
  const paid = await Promise.all([1, 2].map(() => request.post(`/api/admin/orders/${saved.orderId}/paid`, { data: {}, headers: { origin } })));
  expect(paid.map(response => response.status()).sort()).toEqual([200, 400]);
  const cancel = () => request.post(`/api/admin/orders/${saved.orderId}/transition`, { data: { to: "CANCELLED", sendEmail: false }, headers: { origin } });
  const cancellations = await Promise.all([cancel(), cancel()]);
  expect(cancellations.map(response => response.status()).sort()).toEqual([200, 400]);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(5);
  expect(await prisma.orderEvent.count({ where: { orderId: saved.orderId, type: "PAID" } })).toBe(1);
  await request.delete(`/api/admin/drops/${dropId}`, { headers: { origin } });
  expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).dropId).toBe(dropId);
  expect((await request.get("/shop/test-tee")).status()).toBe(404);
  await db.query("UPDATE club_member SET role = 'member' WHERE email = $1", [organiser]);
  expect((await request.get("/admin")).status()).toBe(403);
});

test("email delivery failure still returns the saved reservation without claiming an email was sent", async ({ request }) => {
  const saved = await order(request, "delivery-failure@example.com");
  expect(saved.emailSent).toBe(false);
  const receipt = await request.get(`/orders/${saved.orderId}?t=${saved.guestToken}`);
  expect(await receipt.text()).toContain("confirmation email could not be sent");
  expect(await prisma.order.count()).toBe(1);
});

test("reservation endpoint rejects cross-origin requests and rate limits guest requests", async ({ request }) => {
  expect((await request.post("/api/reserve", { data: payload(), headers: { origin: "https://outside.example" } })).status()).toBe(403);
  expect((await request.post("/api/reserve", { data: payload() })).status()).toBe(403);
  await prisma.product.update({ where: { id: productId }, data: { stock: null } });
  const data = payload();
  for (let index = 0; index < 10; index++) expect((await reserve(request, data)).status()).toBe(200);
  expect((await reserve(request, data)).status()).toBe(429);
  expect(await prisma.order.count()).toBe(1);
});

test("mobile shopper can reserve, sign in with the receipt email, and view their account", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/shop/test-tee", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Test Surf Tee", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/shop-mobile-product.png", fullPage: true });
  await page.getByLabel("Your name").fill("Mobile Shopper");
  await page.getByLabel("Email", { exact: false }).fill("mobile-shopper@example.com");
  await page.getByRole("button", { name: /Reserve/ }).click();
  await expect(page).toHaveURL(/\/orders\/.+\?t=/);
  await expect(page.getByText("Your kit", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/shop-mobile-receipt.png", fullPage: true });
  await page.goto("/login?next=/account/orders", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Your email address").fill("mobile-shopper@example.com");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByLabel("Your six-digit code")).toBeVisible();
  await page.getByLabel("Your six-digit code").fill(await codeFor("mobile-shopper@example.com"));
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(/\/account\/orders$/);
  await expect(page.getByRole("link", { name: "View reservation" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("seeding is additive and migration reruns preserve existing products and roster", async ({ request }) => {
  await signIn(request, organiser);
  await request.post("/api/kids", { headers: { origin }, data: { name: "Preserved Duckie" } });
  execFileSync("pnpm", ["db:seed"], { env: process.env, stdio: "pipe" });
  const seeded = await prisma.product.findUniqueOrThrow({ where: { slug: "tee-cream" } });
  await prisma.product.update({ where: { id: seeded.id }, data: { priceCents: 123400 } });
  execFileSync("pnpm", ["db:seed"], { env: process.env, stdio: "pipe" });
  execFileSync("pnpm", ["db:migrate"], { env: process.env, stdio: "pipe" });
  expect((await prisma.product.findUniqueOrThrow({ where: { id: seeded.id } })).priceCents).toBe(123400);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).active).toBe(true);
  expect((await prisma.drop.findUniqueOrThrow({ where: { slug: "drop-001" } })).status).toBe("DRAFT");
  expect((await db.query("SELECT name FROM club_kid")).rows[0].name).toBe("Preserved Duckie");
  await prisma.drop.update({ where: { slug: "drop-001" }, data: { status: "LIVE" } });
  await prisma.product.delete({ where: { slug: "cap" } });
  execFileSync("pnpm", ["db:seed"], { env: process.env, stdio: "pipe" });
  expect((await prisma.product.findUniqueOrThrow({ where: { slug: "cap" } })).active).toBe(false);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: seeded.id } })).priceCents).toBe(123400);
});

test("organiser can use the drop, product, note, and order-action forms in the browser", async ({ request, page }) => {
  const saved = await order(request);
  await signIn(page.request, organiser);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/admin/drops/new", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Name/).fill("Browser Drop");
  await page.getByLabel(/^Slug/).fill("browser-drop");
  await page.getByRole("combobox", { name: /^Status/ }).selectOption("LIVE");
  await page.getByRole("button", { name: /^Create drop/ }).click();
  await expect(page).toHaveURL(/\/admin\/drops$/);
  const drop = await prisma.drop.findUniqueOrThrow({ where: { slug: "browser-drop" } });
  await page.goto("/admin/products/new", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Name/).fill("Browser Product");
  await page.getByLabel(/^Kind/).fill("Tee");
  await page.getByLabel(/^SKU/).fill("BROWSER-TEE");
  await page.getByLabel(/^Slug/).fill("browser-tee");
  await page.getByLabel(/^Description/).fill("Created through the organiser form.");
  await page.getByLabel(/^Price/).fill("950");
  await page.getByRole("combobox", { name: /^Drop/ }).selectOption(drop.id);
  await page.getByRole("button", { name: /^Create product/ }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  expect((await prisma.product.findUniqueOrThrow({ where: { slug: "browser-tee" } })).priceCents).toBe(95000);
  await page.goto(`/admin/orders/${saved.orderId}`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Internal note — only visible to admins.").fill("Browser-only internal note");
  await page.getByRole("button", { name: /^Add internal note/ }).click();
  await expect(page.getByText("Browser-only internal note", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Email customer about this change" }).uncheck();
  await page.getByRole("button", { name: /Confirmed/ }).click();
  await expect.poll(async () => (await prisma.order.findUniqueOrThrow({ where: { id: saved.orderId } })).status).toBe("CONFIRMED");
  await page.screenshot({ path: "test-results/shop-admin-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("migration refuses a legacy Auth.js database without altering its records", async () => {
  await db.query('CREATE TABLE "User" (id text PRIMARY KEY)');
  try {
    await db.query('INSERT INTO "User" VALUES ($1)', ["legacy-record"]);
    expect(() => execFileSync("pnpm", ["db:migrate"], { env: process.env, stdio: "pipe" })).toThrow();
    expect((await db.query('SELECT id FROM "User"')).rows).toEqual([{ id: "legacy-record" }]);
    expect(await prisma.product.count()).toBe(1);
  } finally { await db.query('DROP TABLE "User"'); }
});

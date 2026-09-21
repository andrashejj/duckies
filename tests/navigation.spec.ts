import { test, expect } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";
import { signIn } from "./auth-helpers";
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329";
test.beforeEach(async () => {
  await db.query('TRUNCATE club_parent_profile,club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit CASCADE');
  await db.query("INSERT INTO club_member(email,role) VALUES('parent@example.com','member'),('organiser@example.com','organiser')");
});
test.afterAll(async () => { await db.end(); });

test("signed-in members find their own profile from the public header and save it on a dedicated page", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await signIn(page.request, "parent@example.com");
  await page.goto("/");
  await expect(page.locator("[data-session-menu]")).toBeVisible();
  await expect(page.getByRole("link", { name: /Member sign-in/ })).toHaveCount(0);
  await expect(page.locator("[data-members]")).toHaveCount(0);
  await page.locator("[data-session-menu] summary").click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/account-menu-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/account-menu-mobile.png" });
  await expect(page.getByRole("navigation", { name: "Your account" }).getByRole("link", { name: /Club admin/ })).toBeHidden();
  await page.getByRole("navigation", { name: "Your account" }).getByRole("link", { name: "My profile", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/profile$/);
  const nav = page.getByRole("navigation", { name: "Member navigation" });
  await expect(nav.getByRole("link", { name: "My profile", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Your name", { exact: true })).toBeVisible();
  await page.getByLabel("Your name", { exact: true }).fill("Maya Parent");
  await page.getByLabel("Phone", { exact: true }).fill("+230 5555 1234");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profile saved." })).toBeVisible();
  await page.getByLabel("Photo for Maya Parent").setInputFiles({ name: "parent.png", mimeType: "image/png", buffer: await sharp({ create: { width: 32, height: 32, channels: 3, background: "#edb14a" } }).png().toBuffer() });
  await expect(page.getByRole("img", { name: "Maya Parent's profile" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Save profile", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("Maya Parent");
  await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("+230 5555 1234");
  expect((await db.query('SELECT name FROM "user" WHERE email=$1', ['parent@example.com'])).rows[0].name).toBe("Maya Parent");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/my-profile-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/my-profile-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "test-results/my-profile-dark.png", fullPage: true });
  await nav.getByRole("link", { name: "My family", exact: true }).click();
  await expect(page.getByRole("link", { name: "Edit my profile" })).toBeVisible();
  await expect(page.locator("[data-guardian]")).toContainText("Maya Parent");
  expect(errors).toEqual([]);
});

test("admin has a top menu, legacy roster bookmarks redirect, and sign-out resets the public menu", async ({ page, request }) => {
  await signIn(page.request, "organiser@example.com");
  await page.goto("/login");
  await expect(page).toHaveURL(/\/admin\/kids$/);
  const nav = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(nav.getByRole("link", { name: "Duckies", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Parents", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "My profile", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/admin-navigation-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/admin-navigation-mobile.png", fullPage: true });
  await page.goto("/#our-duckies");
  await expect(page).toHaveURL(/\/admin\/kids$/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(origin + "/");
  await expect(page.locator("[data-session-entry]")).toHaveText("Member sign-in");
  expect((await request.get("/api/session")).headers()["cache-control"]).toContain("no-store");
  for (const path of ["/admin/kids", "/account/profile", "/members"]) {
    expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(302);
  }
});

test("session changes refresh public navigation and ordinary members cannot enter admin", async ({ page }) => {
  await signIn(page.request, "parent@example.com");
  await page.goto("/training-materials");
  await expect(page.locator("[data-session-menu]")).toBeVisible();
  expect((await page.request.get("/admin/kids")).status()).toBe(403);
  expect((await page.request.get("/api/admin/parents")).status()).toBe(403);
  await db.query('DELETE FROM "session"');
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator("[data-session-entry]")).toHaveText("Member sign-in");
  await expect(page.locator("[data-session-menu]")).toBeHidden();
});

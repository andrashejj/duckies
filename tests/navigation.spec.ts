import { test, expect } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";
import { signIn } from "./auth-helpers";
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329";
test.beforeEach(async () => {
  await db.query('TRUNCATE club_member_archive,club_parent_profile,club_kid,club_member,club_coach,"user","session",account,verification,"rateLimit",shop_request_limit CASCADE');
  await db.query("INSERT INTO club_member(email,role) VALUES('parent@example.com','member'),('organiser@example.com','organiser')");
});
test.afterAll(async () => { await db.end(); });

test("signed-in members find their own profile from the public header and save it on a dedicated page", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await signIn(page.request, "parent@example.com");
  await db.query('UPDATE "user" SET name=$1 WHERE email=$2', ['Maya Parent', 'parent@example.com']);
  await db.query(`INSERT INTO club_post(author_id,body) SELECT id,$1 FROM "user" WHERE email=$2`, ["First wave all the way to the beach! Thanks to everyone who cheered Lara on.", 'parent@example.com']);
  await page.goto("/");
  await expect(page.locator("[data-session-entry]")).toHaveAttribute("href", "/members");
  const publicNav = page.getByRole("navigation", { name: "Club navigation", exact: true });
  await expect(publicNav.getByRole("link")).toHaveCount(3);
  await expect(publicNav.locator("details")).toHaveCount(0);
  await expect(page.locator("[data-members]")).toHaveCount(0);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/simple-home-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-session-entry]").click();
  await expect(page).toHaveURL(/\/members$/);
  const nav = page.getByRole("navigation", { name: "Mobile member navigation" });
  await expect(nav.getByRole("link")).toHaveText(["My Feed", "Club Gallery", "Members", "Training", "Cup", "My Family"]);
  await expect(nav.getByRole("link", { name: "My Feed", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Your post")).toBeHidden();
  await expect(page.getByRole("button", { name: "Like post", exact: true }).first()).toBeEnabled();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const visibleNav = width <= 768 ? nav : page.getByRole('navigation', { name: 'Member navigation', exact: true });
    await expect(visibleNav).toBeInViewport();
    await expect(visibleNav.locator('[aria-current="page"]')).toHaveCount(1);
    const info = page.locator('[data-club-info]');
    await expect(info).toHaveJSProperty('open', width > 1100);
    await expect(page.locator('.club-compose')).toBeInViewport();
    await expect(page.locator('[data-post]').first()).toBeInViewport();
    await page.screenshot({ path: `test-results/member-feed-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.screenshot({ path: 'test-results/member-feed-dark-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-club-info] > summary').click();
  await expect(page.getByRole('link', { name: 'Latest surf call on WhatsApp' })).toBeVisible();
  await page.locator('[data-club-info] > summary').click();
  await page.screenshot({ path: 'test-results/member-feed-dark-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await nav.getByRole('link', { name: 'Members', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Members', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('region', { name: 'Club members' }).getByRole('link').filter({ hasText: 'Maya Parent' }).click();
  await expect(nav.getByRole('link', { name: 'Members', exact: true })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole("link", { name: "Club Gallery", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Club Gallery", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Club Gallery", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Share photos", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/simple-photos-mobile.png" });
  await page.getByLabel("Jump to an album").selectOption("clips");
  await expect(page).toHaveURL(/#clips$/);
  await expect(page.locator("#clips")).toBeFocused();
  await page.getByRole("link", { name: "Our photos & moments", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Our photos & moments", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "My Family", exact: true }).click();
  await expect(nav.getByRole("link", { name: "My Family", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Your contact details" }).click();
  await expect(page).toHaveURL(/\/account\/profile$/);
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
  await nav.getByRole("link", { name: "My Family", exact: true }).click();
  await expect(page.getByRole("link", { name: "Edit my profile" })).toBeVisible();
  await expect(page.locator("[data-guardian]")).toContainText("Maya Parent");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(origin + "/");
  await expect(page.locator("[data-session-entry]")).toHaveAttribute("href", "/login");
  expect(errors).toEqual([]);
});

test("admins enter the club and reach every admin tool through the shared menu", async ({ page, request }) => {
  await signIn(page.request, "organiser@example.com");
  for (const path of ['/coach', '/admin/training', '/gallery/duckies']) {
    expect((await page.request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
  }
  await page.goto('/#our-duckies');
  await expect(page.locator('[data-session-entry]')).toHaveAttribute('href', '/members');
  await expect(page).toHaveURL('/#our-duckies');
  await page.goto("/login");
  await expect(page).toHaveURL(/\/members$/);
  const menu = page.locator('[data-club-menu]:visible');
  await menu.locator('summary').click();
  let nav = menu.getByRole("navigation", { name: "Admin navigation" });
  await expect(nav.getByRole('link')).toHaveCount(9);
  for (const href of await nav.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')!))) {
    expect((await page.request.get(href)).status(), href).toBe(200);
  }
  await nav.getByRole('link', { name: 'Duckies', exact: true }).click();
  await menu.locator('summary').click();
  nav = menu.getByRole("navigation", { name: "Admin navigation" });
  await expect(nav.getByRole("link", { name: "Duckies", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Parents", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "My profile", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/admin-navigation-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await menu.locator('summary').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/admin-navigation-mobile.png", fullPage: true });
  await nav.getByRole('link', { name: 'Customers', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/customers$/);
  await expect(page.getByRole('navigation', { name: 'Mobile member navigation' }).locator('[aria-current]')).toHaveCount(0);
  await page.goto("/admin/kids");
  await expect(page).toHaveURL(/\/admin\/kids$/);
  await menu.locator('summary').click();
  await menu.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(origin + "/");
  await expect(page.locator("[data-session-entry]")).toHaveAttribute("href", "/login");
  expect((await request.get("/api/session")).headers()["cache-control"]).toContain("no-store");
  for (const path of ["/admin/kids", "/account/profile", "/members"]) {
    expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(302);
  }
});

test('club resources work on phones and desktops, admin tools stay private, and training bookmarks survive sign-in', async ({ page }) => {
  await signIn(page.request, 'parent@example.com');
  await page.goto('/login?next=/members/training');
  await expect(page).toHaveURL(/\/members\/training$/);
  await expect(page.getByRole('link', { name: 'Training materials · videos & exercise cards →' })).toBeVisible();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const menu = page.locator('[data-club-menu]:visible');
    await menu.locator('summary').click();
    await expect(menu.getByRole('navigation', { name: 'Admin navigation' })).toHaveCount(0);
    for (const label of ['Training materials', 'Club shop', 'Family orders', 'My profile', 'Cup judging', 'Branding workspace']) {
      await expect(menu.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/club-menu-${width}.png` });
    await menu.locator('summary').press('Escape');
    await expect(menu).not.toHaveAttribute('open', '');
    await expect(menu.locator('summary')).toBeFocused();
  }
  const menu = page.locator('[data-club-menu]:visible');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await menu.locator('summary').click();
  await page.screenshot({ path: 'test-results/club-menu-dark.png' });
  for (const href of await menu.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')!))) {
    expect((await page.request.get(href)).status(), href).toBe(200);
  }
  await menu.getByRole('link', { name: 'Training materials', exact: true }).click();
  await expect(page).toHaveURL(/\/training-materials$/);
  await expect(page.getByRole('link', { name: 'Open exercise cards' })).toBeVisible();
  await page.locator('[data-session-entry]').click();
  await expect(page).toHaveURL(/\/members$/);
});

test('coaches have training and materials without member or admin links', async ({ page }) => {
  await db.query("INSERT INTO club_coach(email,name,created_by) VALUES('navigation-coach@example.com','Trainer','organiser@example.com') ON CONFLICT(email) DO NOTHING");
  await signIn(page.request, 'navigation-coach@example.com');
  await page.goto('/');
  await expect(page.locator('[data-session-entry]')).toHaveAttribute('href', '/members/training');
  await page.locator('[data-session-entry]').click();
  const nav = page.getByRole('navigation', { name: 'Member navigation', exact: true });
  await expect(nav.getByRole('link')).toHaveText(['Training', 'Account']);
  const menu = page.locator('[data-club-menu]:visible');
  await menu.locator('summary').click();
  await expect(menu.getByRole('link', { name: 'Training materials' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Club shop' })).toHaveCount(0);
  await expect(menu.getByRole('navigation', { name: 'Admin navigation' })).toHaveCount(0);
  expect((await page.request.get('/admin/kids')).status()).toBe(403);
  expect((await page.request.get('/members/lineup')).status()).toBe(403);
});

test("session changes refresh public navigation and ordinary members cannot enter admin", async ({ page }) => {
  await signIn(page.request, "parent@example.com");
  await page.goto("/training-materials");
  await expect(page.locator("[data-session-entry]")).toHaveAttribute("href", "/members");
  expect((await page.request.get("/admin/kids")).status()).toBe(403);
  expect((await page.request.get("/api/admin/parents")).status()).toBe(403);
  await db.query('DELETE FROM "session"');
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator("[data-session-entry]")).toHaveAttribute("href", "/login");
  await expect(page.getByRole("navigation", { name: "Club navigation", exact: true }).getByRole("link")).toHaveCount(3);
});

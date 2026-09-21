import { test, expect, type APIRequestContext } from '@playwright/test';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { signIn } from './auth-helpers';
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = 'http://127.0.0.1:4329';
const parent = 'public-parent@example.com', friend = 'public-friend@example.com', organiser = 'public-admin@example.com';
const send = (data: unknown) => ({ headers: { origin }, data });
let other: APIRequestContext, admin: APIRequestContext, anon: APIRequestContext, kid: string;
test.beforeEach(async ({ playwright, request }) => {
  await db.query('TRUNCATE club_member_archive,club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit,gallery_upload CASCADE');
  await db.query("INSERT INTO club_member(email,role) VALUES($1,'member'),($2,'member'),($3,'organiser')", [parent, friend, organiser]);
  kid = (await db.query("INSERT INTO club_kid(name) VALUES('Private Child Name') RETURNING id")).rows[0].id;
  await db.query("INSERT INTO club_guardian_access(kid_id,email,name,relationship,phone,updated_by) VALUES($1,$2,'Private Parent','Parent','+230 5555 0000',$2)", [kid, parent]);
  other = await playwright.request.newContext({ baseURL: origin });
  admin = await playwright.request.newContext({ baseURL: origin });
  anon = await playwright.request.newContext({ baseURL: origin });
  await signIn(request, parent); await signIn(other, friend); await signIn(admin, organiser);
});
test.afterEach(async () => { await other.dispose(); await admin.dispose(); await anon.dispose(); });
test.afterAll(async () => { await db.end(); });
async function upload(request: APIRequestContext, note = 'Private original caption') {
  const response = await request.post(`/api/gallery/uploads?note=${encodeURIComponent(note)}`, { headers: { origin, 'content-type': 'image/webp' }, data: await readFile('src/assets/gallery/standing-tall.webp') });
  expect(response.status()).toBe(201); return response.json() as Promise<{ id: string; postId: string }>;
}
async function share(request: APIRequestContext, sourceKey: string, caption = 'A lovely little wave') {
  const response = await request.post('/api/public-shares', send({ sourceKey, caption, publicConsent: true }));
  expect(response.status()).toBe(201); return (await response.json()).path as string;
}

test('public photo links expose only an approved caption and photo; revocation also disables media', async ({ request, page }) => {
  const photo = await upload(request);
  await admin.post('/api/gallery/tags', send({ kidId: kid, photoKey: `upload:${photo.id}` }));
  await other.post(`/api/social/posts/${photo.postId}`, send({ body: 'Private friend reply' }));
  const sourceKey = `post:${photo.postId}`;
  expect((await request.post('/api/public-shares', send({ sourceKey, caption: 'No consent' }))).status()).toBe(400);
  expect((await request.post('/api/public-shares', { headers: { origin: 'https://other.example' }, data: { sourceKey, caption: 'No', publicConsent: true } })).status()).toBe(403);
  expect((await anon.get(`/api/public-shares?source=${sourceKey}`)).status()).toBe(401);
  for (const client of [other, admin]) {
    expect((await client.post('/api/public-shares', send({ sourceKey, caption: 'Not mine', publicConsent: true }))).status()).toBe(403);
    expect((await client.get(`/api/public-shares?source=${sourceKey}`)).status()).toBe(404);
  }
  const path = await share(request, sourceKey, 'Only this caption <script>alert(1)</script>');
  const publicResponse = await anon.get(path);
  expect(publicResponse.status()).toBe(200);
  const html = await publicResponse.text();
  expect(html.includes('Only this caption')).toBe(true);
  await page.goto(path);
  expect(await page.locator('script').evaluateAll(scripts => scripts.some(s => s.textContent?.includes('alert(1)')))).toBe(false);
  await expect(page.locator('.public-moment-caption')).toHaveText('Only this caption <script>alert(1)</script>');
  for (const value of [parent, friend, kid, photo.id, photo.postId, 'Private Child Name', 'Private original caption', 'Private friend reply', '/members/', '/gallery/']) expect(html.includes(value), `Public HTML must omit ${value}`).toBe(false);
  for (const header of ['cache-control', 'cdn-cache-control', 'vercel-cdn-cache-control']) expect(publicResponse.headers()[header]).toContain('no-store');
  expect(publicResponse.headers()['x-robots-tag']).toContain('noindex');
  expect(publicResponse.headers()['referrer-policy']).toBe('no-referrer');
  const image = await anon.get(`${path}/photo.webp`); expect(image.status()).toBe(200); expect(image.headers()['content-type']).toBe('image/webp');
  expect(image.headers()['cache-control']).toContain('no-store');
  expect((await anon.get(`/gallery/photo/${photo.id}.webp`, { maxRedirects: 0 })).status()).toBe(302);
  await db.query('UPDATE club_post SET body=$1 WHERE id=$2', ['New private caption', photo.postId]);
  expect(await (await anon.get(path)).text()).not.toContain('New private caption');
  await other.delete('/api/public-shares', send({ sourceKey })); expect((await anon.get(path)).status()).toBe(200);
  expect((await request.post('/api/public-shares', send({ sourceKey, caption: 'Duplicate', publicConsent: true }))).status()).toBe(409);
  await request.delete('/api/public-shares', send({ sourceKey }));
  for (const url of [path, `${path}/photo.webp`]) expect((await anon.get(url)).status()).toBe(404);
  expect(await (await anon.get(path)).text()).not.toContain('Only this caption');
  const next = await share(request, sourceKey); expect(next).not.toBe(path); expect((await anon.get(path)).status()).toBe(404);
  await admin.delete(`/api/social/posts/${photo.postId}`, send({}));
  expect((await anon.get(next)).status()).toBe(404); expect((await anon.get(`${next}/photo.webp`)).status()).toBe(404);
});

test('guardians can share profile photos, but strangers and organiser-only access cannot publish them', async ({ request }) => {
  const photo = await upload(other);
  const key = `upload:${photo.id}`;
  expect((await request.post('/api/public-shares', send({ sourceKey: key, caption: '', publicConsent: true }))).status()).toBe(403);
  await admin.post('/api/gallery/tags', send({ kidId: kid, photoKey: key }));
  const preview = await (await request.get(`/api/public-shares?source=${key}`)).json(); expect(preview.caption).toBe('');
  const path = await share(request, key, '');
  expect((await anon.get(path)).status()).toBe(200);
  expect((await admin.post('/api/public-shares', send({ sourceKey: key, caption: '', publicConsent: true }))).status()).toBe(403);
  await db.query('UPDATE club_guardian_access SET revoked_at=now() WHERE email=$1', [parent]);
  expect((await anon.get(path)).status()).toBe(404);
  expect((await request.get(`/api/public-shares?source=${key}`)).status()).toBe(200);
  expect((await request.delete('/api/public-shares', send({ sourceKey: key }))).status()).toBe(200);
  await db.query('UPDATE club_guardian_access SET revoked_at=NULL WHERE email=$1', [parent]);
  await admin.post('/api/gallery/tags', send({ kidId: kid, photoKey: 'curated:standing-tall' }));
  const curated = await share(request, 'curated:standing-tall'); expect((await anon.get(`${curated}/photo.webp`)).status()).toBe(200);
  for (const key of ['curated:../../secret', 'post:invalid', 'curated:nonexistent']) expect((await request.get(`/api/public-shares?source=${encodeURIComponent(key)}`)).status()).toBe(400);
  expect((await anon.get('/s/not-a-token')).status()).toBe(404);
});

test('former members share frozen personal content, with no access to post-departure tags or captions', async ({ request }) => {
  const photo = await upload(request, 'Frozen caption');
  const text = await (await request.post('/api/social/posts', send({ body: 'Frozen text' }))).json();
  const before = await share(request, `post:${photo.postId}`);
  await db.query('DELETE FROM club_member WHERE email=$1', [parent]);
  await db.query('UPDATE club_post SET body=$1 WHERE id=$2', ['New private text', text.id]);
  const preview = await (await request.get(`/api/public-shares?source=post:${text.id}`)).json(); expect(preview.caption).toBe('Frozen text');
  expect((await anon.get(before)).status()).toBe(200);
  const archived = await share(request, `post:${text.id}`, preview.caption); const html = await (await anon.get(archived)).text();
  expect(html).toContain('Frozen text'); expect(html).not.toContain('New private text');
  const newer = await upload(other);
  await admin.post('/api/gallery/tags', send({ kidId: kid, photoKey: `upload:${newer.id}` }));
  expect((await request.get(`/api/public-shares?source=upload:${newer.id}`)).status()).toBe(404);
  expect((await request.post('/api/public-shares', send({ sourceKey: `upload:${newer.id}`, caption: '', publicConsent: true }))).status()).toBe(403);
  expect((await request.get('/api/social/posts')).status()).toBe(403);
  await admin.patch(`/api/admin/gallery/${photo.id}`, send({ status: 'rejected' })); expect((await anon.get(before)).status()).toBe(404);
  await request.delete('/api/public-shares', send({ sourceKey: `post:${photo.postId}` }));
  expect((await anon.get(`${archived}/photo.webp`)).status()).toBe(404);
});

test('mobile sharing shows a deliberate public preview, creates a link and stops sharing', async ({ page, request, browser }) => {
  const photo = await upload(request, 'Private photo caption');
  await page.context().addCookies((await request.storageState()).cookies);
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/members/me');
  await page.locator('[data-lb-trigger]').first().click();
  await page.getByRole('dialog', { name: 'Your photos' }).getByRole('button', { name: 'Share publicly' }).click();
  const modal = page.getByRole('dialog', { name: 'Share this moment' });
  await expect(modal.getByRole('button', { name: 'Create public link' })).toBeVisible({ timeout: 15000 });
  await expect(modal.getByLabel('Public caption', { exact: true })).toHaveValue('');
  await modal.getByLabel('Public caption', { exact: true }).fill('First waves, big smiles.');
  await modal.getByRole('checkbox').check();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/public-share-preview-mobile.png' });
  await modal.getByRole('button', { name: 'Create public link' }).click();
  await expect(modal.getByText('Your public link is ready.', { exact: true })).toBeVisible();
  const url = await modal.getByLabel('Your public link', { exact: true }).inputValue();
  const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } }); const publicPage = await visitor.newPage();
  await publicPage.goto(url); await expect(publicPage.getByText('First waves, big smiles.', { exact: true })).toBeVisible();
  await publicPage.locator('.public-moment-photo').evaluate(img => (img as HTMLImageElement).decode());
  await publicPage.evaluate(() => document.fonts.ready);
  expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await publicPage.screenshot({ path: 'test-results/public-moment-mobile.png', fullPage: true }); await visitor.close();
  await modal.getByRole('button', { name: 'Close public sharing' }).click(); await page.keyboard.press('Escape');
  await page.locator('[data-public-link-list]').getByRole('button').click();
  await modal.getByRole('button', { name: 'Stop sharing' }).click();
  await expect(modal.getByText('Sharing stopped. The old link no longer works.', { exact: true })).toBeVisible();
  expect((await anon.get(url)).status()).toBe(404);
  await modal.getByRole('button', { name: 'Close public sharing' }).click();
  await expect(page.locator('[data-public-links-empty]')).toBeVisible();
  await page.locator(`[data-post="${photo.postId}"]`).getByRole('button', { name: 'Share publicly' }).click();
  await expect(modal.getByLabel('Public caption', { exact: true })).toHaveValue('Private photo caption');
});


test('duplicate publication is serialised and a removed item can still be revoked from My moments', async ({ request, page }) => {
  const photo=await upload(request);
  const sourceKey=`post:${photo.postId}`;
  const attempts=await Promise.all([1,2].map(()=>request.post('/api/public-shares',send({sourceKey,caption:'Shared once',publicConsent:true}))));
  expect(attempts.map(r=>r.status()).sort()).toEqual([201,409]);
  const path=(await attempts.find(r=>r.status()===201)!.json()).path;
  await admin.delete(`/api/social/posts/${photo.postId}`,send({}));
  await page.context().addCookies((await request.storageState()).cookies); await page.goto('/members/me');
  await page.locator('[data-public-link-list]').getByRole('button').click();
  const modal=page.getByRole('dialog',{name:'Share this moment'});
  await expect(modal.getByText('This moment is no longer available publicly. You can remove its link below.')).toBeVisible({timeout:15000});
  await modal.getByRole('button',{name:'Stop sharing'}).click();
  await expect(modal.getByText('Sharing stopped. The old link no longer works.')).toBeVisible();
  expect((await anon.get(path)).status()).toBe(404);
  expect((await db.query('SELECT 1 FROM club_public_share WHERE revoked_at IS NULL')).rowCount).toBe(0);
});

test('a late publish response stays attached to its original moment after the dialog changes', async ({ request, page }) => {
  const first=await (await request.post('/api/social/posts',send({body:'First private moment'}))).json();
  const second=await (await request.post('/api/social/posts',send({body:'Second private moment'}))).json();
  await page.context().addCookies((await request.storageState()).cookies);await page.goto('/members/me');
  let finish!:()=>void;
  const held=new Promise<void>(resolve=>{finish=resolve;});
  let published!:()=>void;
  const onPublished=new Promise<void>(resolve=>{published=resolve;});
  await page.route('**/api/public-shares',async route=>{
    if(route.request().method()!=='POST')return route.continue();
    const response=await route.fetch();published();await held;await route.fulfill({response});
  });
  const modal=page.getByRole('dialog',{name:'Share this moment'});
  await page.locator(`[data-post="${first.id}"]`).getByRole('button',{name:'Share publicly'}).click();
  await expect(modal.getByLabel('Public caption',{exact:true})).toHaveValue('First private moment');
  await modal.getByRole('checkbox').check();await modal.getByRole('button',{name:'Create public link'}).click();await onPublished;
  await modal.getByRole('button',{name:'Close public sharing'}).click();
  await page.locator(`[data-post="${second.id}"]`).getByRole('button',{name:'Share publicly'}).click();
  await expect(modal.getByLabel('Public caption',{exact:true})).toHaveValue('Second private moment');
  finish();
  await expect(page.locator('[data-public-link-list] [data-public-share]')).toHaveAttribute('data-public-share',`post:${first.id}`);
  await expect(modal.getByRole('button',{name:'Create public link'})).toBeVisible();
  await expect(modal.getByLabel('Public caption',{exact:true})).toHaveValue('Second private moment');
});

import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { signIn } from "./auth-helpers";
const origin = "http://127.0.0.1:4329";
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const parent = "photo-parent@example.com", organiser = "photo-organiser@example.com", stranger = "photo-stranger@example.com";
let mine: string, other: string, admin: APIRequestContext, guest: APIRequestContext;
const post = (data: unknown) => ({ headers: { origin }, data });
const photoKey = "curated:standing-tall";

test.beforeEach(async ({ playwright }) => {
  await db.query('TRUNCATE club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit,gallery_upload CASCADE');
  await db.query("INSERT INTO club_member(email,role) VALUES($1,'member'),($2,'organiser'),($3,'member')", [parent,organiser,stranger]);
  const kids = (await db.query("INSERT INTO club_kid(name) VALUES('Lara Test'),('Milo Test') RETURNING id")).rows;
  mine = kids[0].id; other = kids[1].id;
  await db.query(`INSERT INTO club_guardian_access(kid_id,email,name,relationship,phone,updated_by)
    VALUES($1,$2,'Test Parent','Parent','+230 5555 1234',$2),($1,'co-parent@example.com','Co-parent','Parent','+230 5555 5678',$2)`, [mine,parent]);
  admin = await playwright.request.newContext({baseURL:origin}); guest = await playwright.request.newContext({baseURL:origin});
  await signIn(admin,organiser);
});
test.afterEach(async()=>{await admin.dispose();await guest.dispose();});
test.afterAll(async()=>{await db.end();});

test("profiles and tag APIs stay inside membership; guardians can manage only their own duckies",async({request,playwright,page})=>{
  expect((await guest.get(`/gallery/duckies/${mine}`,{maxRedirects:0})).status()).toBe(302);
  const denied=await guest.get('/api/gallery/tags');expect(denied.status()).toBe(401);
  expect(denied.headers()['cache-control']).toContain('no-store');
  await signIn(request,parent);
  const result=await (await request.get('/api/gallery/tags')).json();
  expect(result.kids.find((kid:{id:string})=>kid.id===mine).canManage).toBe(true);
  expect(result.kids.find((kid:{id:string})=>kid.id===other).canManage).toBe(false);
  expect(JSON.stringify(result)).not.toContain('phone');
  expect((await request.post('/api/gallery/tags',post({kidId:other,photoKey}))).status()).toBe(403);
  expect((await request.post('/api/gallery/tags',{data:{kidId:mine,photoKey},headers:{origin:'https://elsewhere.example'}})).status()).toBe(403);
  expect((await request.post('/api/gallery/tags',post({kidId:mine,photoKey:'curated:not-a-photo'}))).status()).toBe(404);
  expect((await request.post('/api/gallery/tags',post({kidId:'bad-id',photoKey}))).status()).toBe(400);
  expect((await request.post('/api/gallery/tags',post({kidId:mine,photoKey}))).status()).toBe(200);
  expect((await request.post('/api/gallery/tags',post({kidId:mine,photoKey}))).status()).toBe(200);
  expect((await db.query('SELECT count(*)::int AS n FROM gallery_kid_tag')).rows[0].n).toBe(1);
  const unrelated=await playwright.request.newContext({baseURL:origin});await signIn(unrelated,stranger);
  expect((await unrelated.delete('/api/gallery/tags',post({kidId:mine,photoKey}))).status()).toBe(403);
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.context().addCookies((await unrelated.storageState()).cookies);
  await page.goto(`/gallery/duckies/${mine}`);
  await expect(page.locator('[data-profile-count]')).toHaveText('1');
  await expect(page.getByRole('button',{name:/Tag duckies in photo:/})).toHaveCount(0);
  await page.getByRole('button',{name:/Open photo:/}).click();
  await expect(page.getByRole('dialog',{name:"Lara Test's photos"})).toBeVisible();
  expect(browserErrors).toEqual([]);
  await unrelated.dispose();
});

test("family access alone does not grant the members' photo gallery",async({request})=>{
  await signIn(request,'co-parent@example.com');
  expect((await request.get(`/gallery/duckies/${mine}`,{maxRedirects:0})).headers().location).toBe('/#how-to-join');
  expect((await request.post('/api/gallery/tags',post({kidId:mine,photoKey}))).status()).toBe(403);
});

test("tagging a shared photo puts it on two profiles; removing one tag preserves the other",async({page})=>{
  await signIn(page.request,parent);
  await page.goto(`/gallery?duckie=${mine}`);
  await page.getByRole('button',{name:'Tag duckies in photo: A young surfer stands tall on a knee-high wave, the mountains behind.'}).click();
  const dialog=page.getByRole('dialog',{name:"Who's in this one?"});
  await expect(dialog.getByLabel('Duckie',{exact:true})).toHaveValue(mine);
  await dialog.getByRole('button',{name:'Add to profile'}).click();
  await expect(dialog.getByRole('status')).toContainText('Added to their photo profile.');
  expect((await admin.post('/api/gallery/tags',post({kidId:other,photoKey}))).status()).toBe(200);
  await page.goto(`/gallery/duckies/${mine}`);
  await expect(page.getByRole('heading',{name:'Lara Test',exact:true})).toBeVisible();
  await expect(page.locator('[data-profile-count]')).toHaveText('1');
  await expect(page.getByRole('link',{name:'Milo Test',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Open photo:/}).click();
  await expect(page.getByRole('dialog',{name:"Lara Test's photos"})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/Tag duckies in photo:/}).click();
  await page.getByRole('button',{name:'Remove tag for Lara Test'}).click();
  await expect(dialog.getByRole('status')).toContainText('Tag removed.');
  await page.getByRole('button',{name:'Close photo tags'}).click();
  await expect(page.locator('[data-profile-count]')).toHaveText('0');
  expect((await db.query('SELECT kid_id FROM gallery_kid_tag WHERE photo_key=$1',[photoKey])).rows).toEqual([{kid_id:other}]);
});

test("profile uploads are atomic, moderated photos disappear and deletion removes their tags",async({request})=>{
  await signIn(request,parent);
  const image=await readFile('src/assets/gallery/standing-tall.webp');
  const upload=(kidId:string)=>request.post(`/api/gallery/uploads?kid=${kidId}`,{headers:{origin,'content-type':'image/webp'},data:image});
  expect((await upload(other)).status()).toBe(403);
  expect((await db.query('SELECT count(*)::int AS n FROM gallery_upload')).rows[0].n).toBe(0);
  const response=await upload(mine);expect(response.status()).toBe(201);const {id}=await response.json();
  expect((await db.query('SELECT kid_id FROM gallery_kid_tag WHERE upload_id=$1',[id])).rows).toEqual([{kid_id:mine}]);
  let html=await (await request.get(`/gallery/duckies/${mine}`)).text();expect(html).toContain(`/gallery/photo/${id}.webp`);
  expect((await admin.patch(`/api/admin/gallery/${id}`,post({status:'rejected'}))).status()).toBe(200);
  html=await (await request.get(`/gallery/duckies/${mine}`)).text();expect(html).not.toContain(`/gallery/photo/${id}.webp`);
  expect((await request.get(`/gallery/photo/${id}.webp`)).status()).toBe(404);
  expect((await request.post('/api/gallery/tags',post({kidId:mine,photoKey:`upload:${id}`}))).status()).toBe(404);
  expect((await admin.delete(`/api/admin/gallery/${id}`,post({}))).status()).toBe(200);
  expect((await db.query('SELECT count(*)::int AS n FROM gallery_kid_tag')).rows[0].n).toBe(0);
});

test("mobile photo grid and upload entry work; archived duckies are excluded",async({page})=>{
  await signIn(page.request,parent);
  for(const slug of ['standing-tall','sunset-ride-arms-out','cup-arms-out','crew-and-boards','little-reef-long-wave','bonfire-crew'])
    expect((await admin.post('/api/gallery/tags',post({kidId:mine,photoKey:`curated:${slug}`}))).status()).toBe(200);
  await page.setViewportSize({width:390,height:844});await page.goto(`/gallery/duckies/${mine}`);
  await expect(page.getByRole('button',{name:/Open photo:/})).toHaveCount(6);
  await expect(page.locator('article img').first()).toBeVisible();
  await page.locator('article img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/duckie-photo-profile-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/duckie-photo-profile-desktop.png',fullPage:true});
  await page.getByRole('link',{name:/Upload photos/}).click();
  await expect(page.getByLabel("Add to a duckie's profile")).toHaveValue(mine);
  await page.locator('#share-files').setInputFiles('src/assets/gallery/standing-tall.webp');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:/Add to the gallery/}).click();
  await expect(page.locator('[data-previews]')).toContainText('Added to profile');
  await page.goto(`/gallery/duckies/${mine}`);
  await expect(page.locator('[data-profile-count]')).toHaveText('7');
  await db.query('UPDATE club_kid SET archived_at=now() WHERE id=$1',[mine]);
  expect((await page.request.get(`/gallery/duckies/${mine}`)).status()).toBe(404);
  const tags=await (await page.request.get('/api/gallery/tags')).json();expect(Object.keys(tags.tags)).toHaveLength(0);
});

test("sign-in returns members to the requested photo profile and checks revoked access",async({page})=>{
  await page.goto(`/gallery/duckies/${mine}`);
  await expect(page).toHaveURL(/\/login\?next=/);
  await signIn(page.request,parent);
  await page.reload();
  await expect(page).toHaveURL(`/gallery/duckies/${mine}`);
  await expect(page.getByRole('heading',{name:'Lara Test',exact:true})).toBeVisible();
  await db.query('DELETE FROM club_member WHERE email=$1',[parent]);
  await page.goto(`/login?next=${encodeURIComponent(`/gallery/duckies/${mine}`)}`);
  await expect(page).toHaveURL('/members/profile');
  expect((await page.request.get(`/gallery/duckies/${mine}`,{maxRedirects:0})).headers().location).toBe('/#how-to-join');
});

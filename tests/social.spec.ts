import {test,expect,type APIRequestContext} from '@playwright/test';
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {signIn} from './auth-helpers';
const db=new pg.Pool({connectionString:process.env.DUCKIES_DATABASE_URL});
const origin='http://127.0.0.1:4329';
const parent='social-parent@example.com',friend='social-friend@example.com',organiser='social-organiser@example.com';
const send=(data:unknown)=>({headers:{origin},data});
let admin:APIRequestContext,other:APIRequestContext,kid:string;
test.beforeEach(async({playwright})=>{
  await db.query('TRUNCATE club_member_archive,club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit,gallery_upload CASCADE');
  await db.query("INSERT INTO club_member(email,role) VALUES($1,'member'),($2,'member'),($3,'organiser')",[parent,friend,organiser]);
  kid=(await db.query("INSERT INTO club_kid(name) VALUES('Lara Test') RETURNING id")).rows[0].id;
  await db.query("INSERT INTO club_guardian_access(kid_id,email,name,relationship,phone,updated_by) VALUES($1,$2,'Maya','Parent','+230 5555 0000',$2)",[kid,parent]);
  admin=await playwright.request.newContext({baseURL:origin});other=await playwright.request.newContext({baseURL:origin});
  await signIn(admin,organiser);await signIn(other,friend);
  await db.query('UPDATE "user" SET name=$1 WHERE email=$2',['Tom',friend]);
});
test.afterEach(async()=>{await admin.dispose();await other.dispose();});
test.afterAll(async()=>{await db.end();});
async function upload(request:APIRequestContext,caption:string,kidId?:string){
  const params=new URLSearchParams({note:caption});if(kidId)params.set('kid',kidId);
  const result=await request.post(`/api/gallery/uploads?${params}`,{headers:{origin,'content-type':'image/webp'},data:await readFile('src/assets/gallery/standing-tall.webp')});
  expect(result.status()).toBe(201);return result.json() as Promise<{id:string;postId:string}>;
}
test('active members share text and photos, like, comment and remove only permitted content',async({page,request,playwright})=>{
  const anonymous=await playwright.request.newContext({baseURL:origin});
  expect((await anonymous.get('/api/social/posts')).status()).toBe(401);await anonymous.dispose();
  await signIn(page.request,parent);await db.query('UPDATE "user" SET name=$1 WHERE email=$2',['Maya',parent]);
  await other.post('/api/social/posts',send({body:'Lovely little waves this morning. See you Friday!'}));
  await page.goto('/members');
  await expect(page.getByRole('heading',{name:'My Feed',exact:true})).toBeVisible();
  await page.locator('.club-compose > summary').click();
  await page.getByLabel('Your post').fill('First stand-up today!');
  await page.getByRole('button',{name:'Share',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Shared with the club.');
  const textPost=page.locator('[data-post]').filter({hasText:'First stand-up today!'});
  await expect(textPost).toBeVisible();
  await textPost.getByRole('button',{name:'Like post',exact:true}).click();
  await expect(textPost.getByRole('button',{name:'Unlike post'})).toHaveAttribute('aria-pressed','true');
  await textPost.getByRole('button',{name:'Comments',exact:true}).click();
  await textPost.getByLabel('Write a comment').fill('Thanks to everyone in the water.');
  await textPost.getByRole('button',{name:'Post',exact:true}).click();
  await expect(textPost).toContainText('Thanks to everyone in the water.');
  const id=await textPost.getAttribute('data-post');
  expect((await other.delete(`/api/social/posts/${id}`,send({}))).status()).toBe(403);
  expect((await page.request.post('/api/social/posts',{headers:{origin:'https://elsewhere.example'},data:{body:'no'}})).status()).toBe(403);
  const liked=await (await page.request.get(`/api/social/posts/${id}`)).json();
  expect(liked.post.likes).toBe(1);expect(liked.comments).toHaveLength(1);
  expect(JSON.stringify(liked)).not.toContain('@example.com');
  await page.getByLabel('Your post').fill('Salt water & a very proud little duckie.');
  await page.locator('#post-photo').setInputFiles('src/assets/gallery/standing-tall.webp');
  await page.getByLabel('Tag a duckie', {exact:true}).selectOption(kid);
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Share',exact:true}).click();
  const photoPost=page.locator('[data-post]').filter({hasText:'Salt water & a very proud little duckie.'});
  await expect(photoPost.getByRole('link',{name:'Lara Test',exact:true})).toBeVisible();
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('.social-post-photo img').first().evaluate(img=>(img as HTMLImageElement).decode());
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await expect(page.getByRole('button',{name:'Share',exact:true})).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:'test-results/member-social-desktop.png',animations:'disabled'});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await expect(page.getByRole('navigation',{name:'Mobile member navigation'})).toBeInViewport();
  await page.screenshot({path:'test-results/member-social-mobile.png'});
  await page.getByRole('button',{name:'Switch to dark mode'}).click();
  await page.screenshot({path:'test-results/member-social-dark.png'});
  await photoPost.getByRole('button',{name:'Open post photo'}).click();
  await expect(page.getByRole('dialog',{name:'Post photo'})).toBeVisible();await page.keyboard.press('Escape');
  const photoId=(await (await page.request.get('/api/social/posts')).json()).posts.find((p:{photoId:string|null})=>p.photoId)?.photoId;
  expect((await page.request.get(`/gallery/duckies/${kid}`)).status()).toBe(200);
  expect((await admin.delete(`/api/social/posts/${await photoPost.getAttribute('data-post')}`,send({}))).status()).toBe(200);
  expect((await page.request.get(`/gallery/photo/${photoId}.webp`)).status()).toBe(404);
  await page.reload();await expect(page.locator('[data-post]').filter({hasText:'Salt water & a very proud little duckie.'})).toHaveCount(0);
  expect((await request.get('/members',{maxRedirects:0})).status()).toBe(302);
});

test('former members keep a frozen personal archive, never new content or other families photos',async({request,page})=>{
  await signIn(request,parent);
  const own=await upload(request,'My original caption');
  const tagged=await upload(other,'Already tagged memory');
  const unrelated=await upload(other,'Someone else’s memory');
  expect((await admin.post('/api/gallery/tags',send({kidId:kid,photoKey:`upload:${tagged.id}`}))).status()).toBe(200);
  await admin.post('/api/gallery/tags',send({kidId:kid,photoKey:'curated:standing-tall'}));
  const text=await (await request.post('/api/social/posts',send({body:'My own old post'}))).json();
  await request.post(`/api/social/posts/${text.id}`,send({body:'My own old comment'}));
  await other.post(`/api/social/posts/${text.id}`,send({body:'A friend’s old reply'}));
  expect((await admin.delete(`/api/members?email=${encodeURIComponent(parent)}`,send({}))).status()).toBe(200);
  expect((await request.get('/api/social/posts')).status()).toBe(401);
  await db.query('DELETE FROM "rateLimit"');
  await signIn(request,parent); // departing members can still get a fresh OTP
  expect((await request.get('/api/social/posts')).status()).toBe(403);
  expect((await request.post('/api/social/posts',send({body:'No longer shared'}))).status()).toBe(403);
  expect((await request.post(`/api/social/posts/${text.id}`,send({body:'No new reply'}))).status()).toBe(403);
  expect((await request.put(`/api/social/posts/${text.id}`,send({liked:true}))).status()).toBe(403);
  expect((await request.get(`/members/people/anything`)).status()).toBe(403);
  expect((await request.get('/api/gallery/tags')).status()).toBe(403);
  const newPhoto=await upload(other,'New photo after departure');
  await admin.post('/api/gallery/tags',send({kidId:kid,photoKey:`upload:${newPhoto.id}`}));
  await admin.post('/api/gallery/tags',send({kidId:kid,photoKey:'curated:bonfire-crew'}));
  await other.post(`/api/social/posts/${text.id}`,send({body:'Private new reply'}));
  await admin.patch(`/api/admin/gallery/${own.id}`,send({caption:'Private changed caption'}));
  for(const id of [own.id,tagged.id]){
    const response=await request.get(`/gallery/photo/${id}.webp`);expect(response.status()).toBe(200);expect(response.headers()['cache-control']).toContain('no-store');
  }
  for(const id of [unrelated.id,newPhoto.id])expect((await request.get(`/gallery/photo/${id}.webp`)).status()).toBe(404);
  expect((await request.get('/gallery/asset/standing-tall-small.webp')).status()).toBe(200);
  expect((await request.get('/gallery/asset/bonfire-crew.webp')).status()).toBe(404);
  await page.context().addCookies((await request.storageState()).cookies);await page.goto('/members');
  await expect(page).toHaveURL('/members/me');
  const html=await page.content();
  for(const text of ['My original caption','My own old post','My own old comment'])expect(html).toContain(text);
  for(const text of ['Private changed caption','Private new reply','New photo after departure','Someone else’s memory'])expect(html).not.toContain(text);
  await expect(page.getByRole('button',{name:'Share',exact:true})).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/member-archive-mobile.png',fullPage:true});
  await admin.patch(`/api/admin/gallery/${tagged.id}`,send({status:'rejected'}));
  expect((await request.get(`/gallery/photo/${tagged.id}.webp`)).status()).toBe(404);
  expect(await (await request.get('/members/me')).text()).not.toContain(`/gallery/photo/${tagged.id}.webp`);
  await admin.post('/api/members',send({email:parent}));
  expect((await request.get('/api/social/posts')).status()).toBe(200);
  expect((await request.post('/api/social/posts',send({body:'Back with the crew'}))).status()).toBe(201);
});

test('family-only accounts do not acquire social access and pagination does not duplicate posts',async({request})=>{
  await db.query("INSERT INTO club_guardian_access(kid_id,email,name,relationship,phone,updated_by) VALUES($1,'family-only@example.com','Family','Parent','+230 5555 1111',$2)",[kid,parent]);
  await signIn(request,'family-only@example.com');
  expect((await request.get('/api/social/posts')).status()).toBe(403);
  expect((await request.get('/members/me')).status()).toBe(403);
  expect((await request.get('/members/profile')).status()).toBe(200);
  const user=(await db.query('SELECT id FROM "user" WHERE email=$1',[friend])).rows[0].id;
  await db.query("INSERT INTO club_post(author_id,body) SELECT $1,'Moment '||n FROM generate_series(1,23) n",[user]);
  const first=await (await other.get('/api/social/posts')).json();expect(first.posts).toHaveLength(20);
  const second=await (await other.get(`/api/social/posts?before=${first.next}`)).json();expect(second.posts).toHaveLength(3);
  expect(new Set([...first.posts,...second.posts].map(p=>p.id)).size).toBe(23);
  expect((await other.get('/api/social/posts?before=invalid')).status()).toBe(400);
  const id=first.posts[0].id;
  await db.query("INSERT INTO club_post_comment(post_id,author_id,body) SELECT $1,$2,'Reply '||n FROM generate_series(1,53) n",[id,user]);
  const comments=await (await other.get(`/api/social/posts/${id}`)).json();expect(comments.comments).toHaveLength(50);
  const tail=await (await other.get(`/api/social/posts/${id}?before=${comments.next}`)).json();expect(tail.comments).toHaveLength(3);
  expect((await other.get(`/api/social/posts/${id}?before=invalid`)).status()).toBe(400);
});

test('archiving a child preserves family memories, but revoked guardians do not inherit them',async({request})=>{
  await signIn(request,parent);
  const photo=await upload(other,'Family memory before archiving');
  await admin.post('/api/gallery/tags',send({kidId:kid,photoKey:`upload:${photo.id}`}));
  await db.query("INSERT INTO club_guardian_access(kid_id,email,name,relationship,phone,updated_by,revoked_at) VALUES($1,$2,'Old Guardian','Parent','+230 5555 2222',$3,now())",[kid,organiser,parent]);
  await db.query('UPDATE club_kid SET archived_at=now() WHERE id=$1',[kid]);
  await db.query('DELETE FROM club_member WHERE email=$1',[parent]);
  expect((await request.get(`/gallery/photo/${photo.id}.webp`)).status()).toBe(200);
  await db.query('DELETE FROM club_member WHERE email=$1',[organiser]);
  expect((await admin.get(`/gallery/photo/${photo.id}.webp`)).status()).toBe(404);
});

test('a social write waiting behind membership revocation cannot publish after the archive freezes',async({request})=>{
  await signIn(request,parent);
  const transaction=await db.connect();
  try{
    await transaction.query('BEGIN');
    await transaction.query('DELETE FROM club_member WHERE email=$1',[parent]);
    const pending=request.post('/api/social/posts',send({body:'Must never be published'}));
    // Confirm the request actually reached the membership lock before commit.
    await expect.poll(async()=>Number((await db.query("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT role FROM club_member%FOR SHARE'")).rows[0].count)).toBeGreaterThan(0);
    await transaction.query('COMMIT');
    expect((await pending).status()).toBe(403);
    expect((await db.query("SELECT 1 FROM club_post WHERE body='Must never be published'")).rowCount).toBe(0);
  }finally{await transaction.query('ROLLBACK');transaction.release();}
});

test('legacy recovery keeps proven uploads without guessing a departure date or family tag history',async({request})=>{
  await signIn(request,parent);
  const own=await upload(request,'A proven old upload');
  const tagged=await upload(other,'An undated family tag');
  await admin.post('/api/gallery/tags',send({kidId:kid,photoKey:`upload:${tagged.id}`}));
  await db.query('DELETE FROM club_member WHERE email=$1',[parent]);
  // This is the recovery function used by the migration for earlier removals.
  await db.query('SELECT snapshot_member_archive($1,false)',[parent]);
  const row=(await db.query('SELECT departure_known,photos FROM club_member_archive WHERE email=$1',[parent])).rows[0];
  expect(row.departure_known).toBe(false);expect(row.photos.map((p:{key:string})=>p.key)).toEqual([`upload:${own.id}`]);
  expect((await request.get(`/gallery/photo/${tagged.id}.webp`)).status()).toBe(404);
  const html=await (await request.get('/members/me')).text();expect(html).toContain('Your previously shared photos, kept for you.');expect(html).not.toContain('Saved when your membership ended');
});

test('one club directory combines parents and duckies, keeps role labels accurate and supports old links', async ({page}) => {
  await signIn(page.request,parent);
  await db.query('UPDATE "user" SET name=$1 WHERE email=$2',['Maya',parent]);
  await page.goto('/gallery/duckies');
  await expect(page).toHaveURL('/members/lineup');
  const directory=page.getByRole('region',{name:'Club members'});
  await expect(directory.getByRole('link',{name:/Maya Parent/})).toBeVisible();
  await expect(directory.getByRole('link',{name:/Lara Test Duckie/})).toBeVisible();
  await expect(directory.getByRole('link',{name:/Tom Member/})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Member navigation'}).getByRole('link',{name:'Duckies',exact:true})).toHaveCount(0);
  await page.getByLabel('Find someone').fill('lara');
  await expect(directory.locator('[data-club-person]:visible')).toHaveCount(1);
  await page.getByLabel('Find someone').fill('no such member');
  await expect(directory.getByRole('status')).toHaveText('No one matches that name.');
  await page.getByLabel('Find someone').fill('');
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/unified-club-${width}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Switch to dark mode'}).click();
  await page.screenshot({path:'test-results/unified-club-dark.png',fullPage:true});
  await directory.getByRole('link',{name:/Lara Test Duckie/}).click();
  await expect(page).toHaveURL(`/gallery/duckies/${kid}`);
  await expect(page.getByRole('heading',{name:'Lara Test',exact:true})).toBeVisible();
  await expect(page.locator('.journal-identity .club-role')).toHaveText('Duckie');
  await expect(page.getByRole('navigation',{name:'Mobile member navigation'}).getByRole('link',{name:'Members',exact:true})).toHaveAttribute('aria-current','page');
});
test('a parent photo appears on their posts, profile and directory card, and the avatar route is members-only', async ({page,playwright})=>{
  await signIn(page.request,parent);
  await db.query('UPDATE "user" SET name=$1 WHERE email=$2',['Maya',parent]);
  await db.query("DELETE FROM club_parent_profile WHERE email=$1",[parent]);
  const photo=await page.request.put(`/api/parents/photo?email=${encodeURIComponent(parent)}`,{headers:{origin,'content-type':'image/webp'},data:await readFile('src/assets/gallery/standing-tall.webp')});
  expect(photo.status()).toBe(200);
  const mayaId=(await db.query('SELECT id FROM "user" WHERE email=$1',[parent])).rows[0].id as string;
  await page.request.post('/api/social/posts',send({body:'Sunrise session, everyone up on their feet.'}));
  await other.post('/api/social/posts',send({body:'Tom here, still working on the pop-up.'}));
  // The version rides in the URL and no email does; only the avatar itself is fetched.
  const feed=await (await other.get('/api/social/posts')).json();
  const authors=feed.posts.map((post:{author:{id:string;photoVersion:string|null}})=>post.author);
  expect(authors.find((author:{id:string})=>author.id===mayaId).photoVersion).toBeTruthy();
  expect(authors.find((author:{id:string})=>author.id!==mayaId).photoVersion).toBeNull();
  expect(JSON.stringify(feed)).not.toContain('@example.com');
  const avatar=await other.get(`/api/social/avatars/${mayaId}`);
  expect(avatar.status()).toBe(200);expect(avatar.headers()['content-type']).toBe('image/webp');
  expect(avatar.headers()['cache-control']).toContain('no-store');
  const tomId=(await db.query('SELECT id FROM "user" WHERE email=$1',[friend])).rows[0].id as string;
  expect((await other.get(`/api/social/avatars/${tomId}`)).status()).toBe(404);
  expect((await other.get('/api/social/avatars/nobody')).status()).toBe(404);
  const anonymous=await playwright.request.newContext({baseURL:origin});
  expect((await anonymous.get(`/api/social/avatars/${mayaId}`)).status()).toBe(401);await anonymous.dispose();
  // A fourth sign-in code in one minute: clear the OTP rate limit, as beforeEach does.
  await db.query('TRUNCATE "rateLimit"');
  const family=await playwright.request.newContext({baseURL:origin});
  await db.query("INSERT INTO club_guardian_access(kid_id,email,name,relationship,phone,updated_by) VALUES($1,'social-family@example.com','Family','Parent','+230 5555 0001',$2)",[kid,parent]);
  await signIn(family,'social-family@example.com');
  expect((await family.get(`/api/social/avatars/${mayaId}`)).status()).toBe(403);await family.dispose();
  // In the club: Maya's photo on her post, the composer, her header and directory card; Tom keeps his initial.
  await page.goto('/members');
  const mayaPost=page.locator('[data-post]').filter({hasText:'Sunrise session'});
  await expect(mayaPost.locator('img.social-avatar')).toHaveAttribute('src',new RegExp(`^/api/social/avatars/${mayaId}\\?v=`));
  await expect(page.locator('.club-compose > summary img.social-avatar')).toBeVisible();
  const tomPost=page.locator('[data-post]').filter({hasText:'Tom here'});
  await expect(tomPost.locator('span.social-avatar')).toHaveText('T');
  await page.goto(`/members/people/${mayaId}`);
  await expect(page.getByAltText("Maya's profile photo")).toBeVisible();
  await page.goto('/members/lineup');
  await expect(page.getByRole('region',{name:'Club members'}).getByRole('link',{name:/Maya Parent/}).getByAltText("Maya's profile photo")).toBeVisible();
  // Removing the photo takes it off the club again.
  expect((await page.request.delete(`/api/parents/photo?email=${encodeURIComponent(parent)}`,{headers:{origin}})).status()).toBe(200);
  expect((await other.get(`/api/social/avatars/${mayaId}`)).status()).toBe(404);
  await page.goto(`/members/people/${mayaId}`);
  await expect(page.locator('.journal-avatar-inner')).toHaveText('M');
});

import { test, expect } from "@playwright/test";
import pg from "pg";
import { signIn } from "./auth-helpers";
import { planMilestones, planPeople } from "../src/data/plan-tasks";
const db=new pg.Pool({connectionString:process.env.DUCKIES_DATABASE_URL});
const origin="http://127.0.0.1:4329";
const seededTasks=planMilestones.reduce((n,m)=>n+m.tasks.length,0);

test.beforeEach(async()=>{
  await db.query('TRUNCATE club_member_archive,plan_task_event, plan_task, plan_milestone, plan_person, branding_access_event, branding_access, club_member, "user", "session", account, verification, "rateLimit" CASCADE');
  await db.query("DELETE FROM shop_request_limit WHERE key LIKE 'plan-message:%'");
  await db.query("INSERT INTO club_member(email,role) VALUES ('organiser@example.com','organiser'),('parent@example.com','member')");
  await db.query("INSERT INTO branding_access(email,name,status,can_edit,verified_at) VALUES ('organiser@example.com','Editor','approved',true,now()),('parent@example.com','Reader','approved',false,now())");
});
test.afterAll(async()=>{await db.end();});

test("anonymous visitors get no plan data and are sent to the teaser",async({request})=>{
  expect((await request.get('/api/plan')).status()).toBe(401);
  expect((await request.patch('/api/plan/tasks/recipe-1',{data:{status:'done',version:1}})).status()).toBe(401);
  for(const url of ['/branding-plan/board','/branding-plan/plan','/branding-plan/onsite','/branding-plan/vision','/branding-plan/deliverables','/branding-plan/business-case','/branding-plan/marketing']){
    const page=await request.get(url,{maxRedirects:0});
    expect(page.status()).toBe(302);expect(page.headers().location).toBe('/branding-plan');
  }
  expect((await db.query("SELECT count(*)::int AS n FROM plan_task")).rows[0].n).toBe(0);
});

test("the first approved read seeds the plan; readers cannot change it",async({request})=>{
  await signIn(request,'parent@example.com');
  const r=await request.get('/api/plan');expect(r.status()).toBe(200);
  const plan=await r.json();
  expect(plan.canEdit).toBe(false);
  expect(plan.people.map((p:{id:string})=>p.id)).toEqual(planPeople.map(p=>p.id));
  expect(plan.people.find((p:{id:string})=>p.id==='estelle').email).toBe('niki.este.2022@ksz.edu-zg.ch');
  expect(plan.milestones).toHaveLength(planMilestones.length);
  expect(plan.milestones.flatMap((m:{tasks:unknown[]})=>m.tasks)).toHaveLength(seededTasks);
  const event=plan.milestones.find((m:{id:string})=>m.id==='event');expect(event.dueOn).toBe('2026-10-16');expect(event.ownerId).toBe('estelle');expect(event.links.length).toBeGreaterThan(0);
  const first=plan.milestones[0].tasks[0];expect(first).toMatchObject({id:'design-1',ownerId:'estelle',dueOn:'2026-09-25',status:'todo',version:1});
  expect(plan.milestones.flatMap((m:{tasks:{ownerId:string|null}[]})=>m.tasks).filter((t:{ownerId:string|null})=>t.ownerId==='andras')).toHaveLength(0);
  expect(plan.milestones.find((m:{id:string})=>m.id==='design').ownerId).toBe('dori');
  expect((await request.patch('/api/plan/tasks/recipe-1',{headers:{origin},data:{status:'doing',version:1}})).status()).toBe(403);
  expect((await request.post('/api/plan',{headers:{origin},data:{milestoneId:'recipe',text:'Reader task',ownerId:null,dueOn:null}})).status()).toBe(403);
  // A second read does not seed twice.
  expect((await (await request.get('/api/plan')).json()).milestones).toHaveLength(planMilestones.length);
});

test("editors move tasks, reassign owners and add tasks, with version and origin checks",async({page})=>{
  const request=page.request;
  await signIn(request,'organiser@example.com');
  expect((await (await request.get('/api/plan')).json()).canEdit).toBe(true);
  expect((await request.patch('/api/plan/tasks/recipe-1',{headers:{origin:'https://elsewhere.example'},data:{status:'doing',version:1}})).status()).toBe(403);
  expect((await request.patch('/api/plan/tasks/recipe-1',{headers:{origin},data:{version:1}})).status()).toBe(400);
  expect((await request.patch('/api/plan/tasks/recipe-1',{headers:{origin},data:{status:'doing',ownerId:'nobody',version:1}})).status()).toBe(400);
  expect((await request.patch('/api/plan/tasks/missing',{headers:{origin},data:{status:'doing',version:1}})).status()).toBe(404);
  const moved=await request.patch('/api/plan/tasks/recipe-1',{headers:{origin},data:{status:'doing',version:1}});
  expect(moved.status()).toBe(200);expect((await moved.json()).task).toMatchObject({status:'doing',ownerId:'estelle',version:2});
  expect((await request.patch('/api/plan/tasks/recipe-1',{headers:{origin},data:{status:'done',version:1}})).status()).toBe(409);
  const reassigned=await request.patch('/api/plan/tasks/recipe-1',{headers:{origin},data:{ownerId:'estelle',version:2}});
  expect((await reassigned.json()).task).toMatchObject({status:'doing',ownerId:'estelle',version:3});
  const cleared=await request.patch('/api/plan/tasks/recipe-1',{headers:{origin},data:{ownerId:null,status:'done',version:3}});
  expect((await cleared.json()).task).toMatchObject({status:'done',ownerId:null,version:4});
  expect((await db.query("SELECT status,owner_id,actor FROM plan_task_event WHERE task_id='recipe-1' ORDER BY id")).rows).toEqual([
    {status:'doing',owner_id:'estelle',actor:'organiser@example.com'},{status:'doing',owner_id:'estelle',actor:'organiser@example.com'},{status:'done',owner_id:null,actor:'organiser@example.com'}]);
  // Review sits between doing and done.
  const review=await request.patch('/api/plan/tasks/recipe-2',{headers:{origin},data:{status:'review',version:1}});
  expect(review.status()).toBe(200);expect((await review.json()).task).toMatchObject({status:'review',ownerId:'estelle',version:2});
  expect((await request.patch('/api/plan/tasks/recipe-3',{headers:{origin},data:{status:'approved',version:1}})).status()).toBe(400);

  expect((await request.post('/api/plan',{headers:{origin},data:{milestoneId:'recipe',text:'no',ownerId:null,dueOn:null}})).status()).toBe(400);
  expect((await request.post('/api/plan',{headers:{origin},data:{milestoneId:'nowhere',text:'Print the price sign',ownerId:null,dueOn:null}})).status()).toBe(400);
  const created=await request.post('/api/plan',{headers:{origin},data:{milestoneId:'event',text:'Print the price sign',ownerId:'estelle',dueOn:'2026-10-14'}});
  expect(created.status()).toBe(201);
  const task=(await created.json()).task;expect(task).toMatchObject({milestoneId:'event',ownerId:'estelle',dueOn:'2026-10-14',status:'todo',version:1});
  expect(task.sort).toBe(planMilestones.find(m=>m.id==='event')!.tasks.length);

  // The overview, plan and onsite pages read the same record: the done task, the new task, the milestones in due order.
  const plan=await (await request.get('/branding-plan/plan')).text();
  expect(plan).toContain('Done: </span>Lock the ingredient list, bag weight and product name');
  expect(plan).toContain('In review: </span>First bake. Weigh the cooled yield');
  expect(plan).toContain('Print the price sign');
  expect(plan).toContain('href="/branding-plan/board"');
  expect(plan.indexOf('>Design<')).toBeLessThan(plan.indexOf('>Recipe<'));
  const onsite=await (await request.get('/branding-plan/onsite')).text();
  expect(onsite).toContain('Print the price sign');
  expect(onsite).toContain('Week 3 · Go / no-go, first batch, the Cup');
  expect(onsite).not.toContain('Go / no-go: pouches');
  const overview=await (await request.get('/branding-plan')).text();
  expect(overview).toContain('First bake. Weigh the cooled yield');expect(overview).toContain('with Dori for review');
  expect(overview).not.toContain('Lock the ingredient list, bag weight');

  // The board opens on the swimlanes and renders both views with live status.
  await page.goto('/branding-plan/board');
  await expect(page.getByRole('heading',{name:'Who does what.'})).toBeVisible();
  await expect(page.getByRole('tab',{name:'Board'})).toHaveAttribute('aria-selected','true');
  // Lanes start collapsed except the one up next.
  await expect(page.getByRole('region',{name:'Design · To do'})).toBeVisible();
  await expect(page.getByRole('region',{name:'Recipe · To do'})).toHaveCount(0);
  await page.getByRole('button',{name:'Expand all'}).click();
  await expect(page.getByRole('region',{name:'Recipe · To do'})).toBeVisible();
  await expect(page.getByRole('region',{name:'Recipe · Review'}).getByText('First bake',{exact:false})).toBeVisible();
  await expect(page.getByRole('region',{name:'Design',exact:true})).toContainText('Up next');
  await page.getByRole('tab',{name:'Timeline'}).click();
  await expect(page).toHaveURL(/view=timeline/);
  await expect(page.getByText('A locked recipe with a real cost per bag',{exact:false})).toBeVisible();
  await page.screenshot({path:'test-results/plan-timeline-desktop.png',fullPage:true});
  await page.getByRole('tab',{name:'Board'}).click();
  await expect(page).toHaveURL(/view=board/);
  const done=page.getByRole('region',{name:'Recipe · Done'});
  await expect(done.getByText('Lock the ingredient list, bag weight',{exact:false})).toBeVisible();
  await page.getByLabel('Filter by owner').selectOption('abiguelle');
  await expect(page.getByRole('region',{name:'Produce · To do'}).getByText('Second pair of hands',{exact:false})).toBeVisible();
  await expect(page.getByRole('region',{name:'Recipe',exact:true})).toHaveCount(0);
  await page.screenshot({path:'test-results/plan-board-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/plan-board-mobile.png',fullPage:true});
});

test("a pre-approved person can sign in with the code and edit straight away",async({request})=>{
  // Mirrors the rows 009-plan-board.sql inserts for Estelle and Dori.
  await db.query("INSERT INTO branding_access(email,name,reason,status,can_edit,verified_at,decided_at,decided_by) VALUES ('niki.este.2022@ksz.edu-zg.ch','Estelle Lily Nikischer','Onsite','approved',true,now(),now(),'andras@hejj.xyz')");
  await signIn(request,'niki.este.2022@ksz.edu-zg.ch');
  const plan=await (await request.get('/api/plan')).json();
  expect(plan.canEdit).toBe(true);
  const r=await request.patch('/api/plan/tasks/recipe-2',{headers:{origin},data:{status:'doing',version:1}});
  expect(r.status()).toBe(200);expect((await r.json()).task.ownerId).toBe('estelle');
});

const discussionURL = '/api/plan/tasks/recipe-1/discussion';
const quoteFile = { name: 'Kostomize quote.txt', mimeType: 'text/plain', buffer: Buffer.from('100 stickers at Rs 18 each') };

test('task discussions and downloads require current branding access; only editors can contribute', async ({ request }) => {
  expect((await request.get(discussionURL)).status()).toBe(401);
  expect((await request.post(discussionURL, { headers: { origin }, multipart: { kind: 'comment', body: 'Hello' } })).status()).toBe(401);
  await signIn(request, 'organiser@example.com');
  await request.get('/api/plan');
  expect((await request.post(discussionURL, { headers: { origin: 'https://elsewhere.example' }, multipart: { kind: 'comment', body: 'Hello' } })).status()).toBe(403);
  const saved = await request.post(discussionURL, { headers: { origin }, multipart: { kind: 'update', body: 'Kostomize quoted Rs 18 per sticker.', files: quoteFile, author: 'someone-else@example.com' } });
  expect(saved.status()).toBe(201);
  const result = await request.get(discussionURL);
  expect(result.headers()['cache-control']).toContain('no-store');
  const discussion = await result.json();
  expect(discussion.messages).toHaveLength(1);
  expect(discussion.messages[0]).toMatchObject({ kind: 'update', authorName: 'Editor', body: 'Kostomize quoted Rs 18 per sticker.' });
  expect((await db.query('SELECT author FROM plan_task_message')).rows[0].author).toBe('organiser@example.com');
  const file = discussion.messages[0].attachments[0];
  expect(file).toMatchObject({ filename: quoteFile.name, size: quoteFile.buffer.length });
  expect(file.bytes).toBeUndefined();
  const download = `/api/plan/tasks/recipe-1/attachments/${file.id}`;
  const response = await request.get(download);
  expect(await response.body()).toEqual(quoteFile.buffer);
  expect(response.headers()['content-disposition']).toContain('attachment;');
  expect(response.headers()['content-type']).toBe('application/octet-stream');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['cache-control']).toContain('no-store');
  expect((await request.get(`/api/plan/tasks/recipe-2/attachments/${file.id}`)).status()).toBe(404);
  await signIn(request, 'parent@example.com');
  expect((await request.get(discussionURL)).status()).toBe(200);
  expect((await request.get(download)).status()).toBe(200);
  expect((await request.post(discussionURL, { headers: { origin }, multipart: { kind: 'comment', body: 'Reader cannot post' } })).status()).toBe(403);
  await db.query("UPDATE branding_access SET status='revoked' WHERE email='parent@example.com'");
  expect((await request.get(discussionURL)).status()).toBe(403);
  expect((await request.get(download)).status()).toBe(403);
  const page = await request.get('/branding-plan/tasks/recipe-1', { maxRedirects: 0 });
  expect(page.status()).toBe(302);
  expect(page.headers().location).toBe('/branding-plan');
});

test('discussion validation rejects empty, malformed and oversized uploads without partial saves', async ({ request }) => {
  await signIn(request, 'organiser@example.com');
  await request.get('/api/plan');
  for (const data of [{ kind: 'comment', body: '  ' }, { kind: 'unknown', body: 'Hello' }, { kind: 'update', body: 'x'.repeat(4001) }]) {
    expect((await request.post(discussionURL, { headers: { origin }, multipart: data })).status()).toBe(400);
  }
  expect((await request.post(discussionURL, { headers: { origin }, data: { kind: 'comment', body: 'Hello' } })).status()).toBe(415);
  expect((await request.post(discussionURL, { headers: { origin, 'content-type': 'multipart/form-data; boundary=bad' }, data: 'not multipart' })).status()).toBe(400);
  const oversized = { ...quoteFile, buffer: Buffer.alloc(3 * 1024 * 1024 + 1) };
  expect((await request.post(discussionURL, { headers: { origin }, multipart: { kind: 'comment', body: 'Quote', files: oversized } })).status()).toBe(413);
  const tooMany = new FormData(); tooMany.set('kind', 'comment');
  for (let i = 0; i < 4; i++) tooMany.append('files', new File(['quote'], `quote-${i}.txt`));
  expect((await request.post(discussionURL, { headers: { origin }, multipart: tooMany })).status()).toBe(400);
  expect((await request.post(discussionURL.replace('recipe-1', 'missing'), { headers: { origin }, multipart: { kind: 'comment', body: 'Hello', files: quoteFile } })).status()).toBe(404);
  expect((await db.query('SELECT count(*)::int AS n FROM plan_task_message')).rows[0].n).toBe(0);
  expect((await db.query('SELECT count(*)::int AS n FROM plan_task_attachment')).rows[0].n).toBe(0);
  const file = { name: 'design.html', mimeType: 'text/html', buffer: Buffer.from('<script>alert(1)</script>') };
  expect((await request.post(discussionURL, { headers: { origin }, multipart: { kind: 'comment', files: file } })).status()).toBe(201);
  const d = await (await request.get(discussionURL)).json();
  const attachment = await request.get(`/api/plan/tasks/recipe-1/attachments/${d.messages[0].attachments[0].id}`);
  expect(attachment.headers()['content-type']).toBe('application/octet-stream');
  expect(attachment.headers()['content-disposition']).toContain('attachment;');
});

test('concurrent messages preserve task status and history and editor revocation stops writes', async ({ request }) => {
  await signIn(request, 'organiser@example.com');
  await request.get('/api/plan');
  await request.patch('/api/plan/tasks/recipe-1', { headers: { origin }, data: { status: 'review', version: 1 } });
  const results = await Promise.all(['First question', 'Second question'].map(body => request.post(discussionURL, { headers: { origin }, multipart: { kind: 'comment', body } })));
  expect(results.map(r => r.status())).toEqual([201, 201]);
  const discussion = await (await request.get(discussionURL)).json();
  expect(discussion.messages).toHaveLength(2);
  expect(discussion.task).toMatchObject({ status: 'review', version: 2, ownerId: 'estelle' });
  expect(discussion.events).toHaveLength(1);
  expect(discussion.events[0]).toMatchObject({ status: 'review', ownerName: 'Estelle', authorName: 'Editor' });
  await db.query("UPDATE branding_access SET can_edit=false WHERE email='organiser@example.com'");
  expect((await request.post(discussionURL, { headers: { origin }, multipart: { kind: 'update', body: 'Cannot save' } })).status()).toBe(403);
  expect((await db.query('SELECT count(*)::int AS n FROM plan_task_message')).rows[0].n).toBe(2);
});

test('Estelle can open a board task, post a comment and an attachment, and read them after reload', async ({ page }) => {
  await db.query("INSERT INTO branding_access(email,name,status,can_edit,verified_at) VALUES ('niki.este.2022@ksz.edu-zg.ch','Estelle','approved',true,now())");
  await signIn(page.request, 'niki.este.2022@ksz.edu-zg.ch');
  await page.goto('/branding-plan/board');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByLabel('Filter by owner').selectOption('estelle');
  await page.getByRole('button', { name: /^Open task:/ }).first().click();
  await expect(page).toHaveURL(/branding-plan\/board/);
  await expect(page.getByRole('dialog', { name: 'Task details' })).toBeVisible();
  await expect(page.getByText('No comments yet.', { exact: false })).toBeVisible();
  await page.getByLabel('Message', { exact: true }).fill('Can we use this sticker size? <script>alert(1)</script>');
  await page.getByLabel('Attachments', { exact: true }).setInputFiles(quoteFile);
  await page.route('**/api/plan/tasks/design-1/discussion', async route => {
    if (route.request().method() === 'POST') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Please try again.' }) });
    return route.continue();
  });
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Please try again.');
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('Can we use this sticker size? <script>alert(1)</script>');
  await expect(page.getByRole('button', { name: `Remove ${quoteFile.name}` })).toBeVisible();
  await page.unroute('**/api/plan/tasks/design-1/discussion');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Comment added.');
  await expect(page.getByLabel('Message type')).toHaveCount(0);
  await page.getByLabel('Message', { exact: true }).fill('Called Kostomize. The quote is Rs 18 per sticker.');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Comment added.');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByLabel('Filter by owner')).toHaveValue('estelle');
  await expect(page.getByText('2 comments · 1 file', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /^Open task:/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
  await expect(page.getByText('Can we use this sticker size? <script>alert(1)</script>', { exact: true })).toBeVisible();
  await expect(page.getByText('Called Kostomize. The quote is Rs 18 per sticker.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: `Download ${quoteFile.name}`, exact: false })).toBeVisible();
  await page.evaluate(async () => { window.scrollTo(0, 0); await document.fonts.ready; });
  await page.screenshot({ path: 'test-results/task-discussion-desktop.png', fullPage: false, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/task-discussion-mobile-dark.png', fullPage: false, animations: 'disabled' });
  await signIn(page.request, 'parent@example.com');
  await page.goto('/branding-plan/tasks/design-1');
  await expect(page.getByRole('button', { name: 'Edit description' })).toHaveCount(0);
  await expect(page.getByText('You have viewing access.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Post comment', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: `Download ${quoteFile.name}`, exact: false })).toBeVisible();
});


test('description edits are validated, versioned, audited and restricted to editors', async ({ request }) => {
  await signIn(request, 'organiser@example.com');
  await request.get('/api/plan');
  const endpoint = '/api/plan/tasks/design-1';
  for (const text of ['  ', 'xx', 'x'.repeat(401), 'bad\0text']) {
    expect((await request.patch(endpoint, { headers: { origin }, data: { text, version: 1 } })).status()).toBe(400);
  }
  const response = await request.patch(endpoint, { headers: { origin }, data: { text: 'Order 100 bags in the agreed size.', version: 1 } });
  expect(response.status()).toBe(200);
  expect((await response.json()).task).toMatchObject({ text: 'Order 100 bags in the agreed size.', version: 2, status: 'todo', ownerId: 'estelle', messageCount: 1, attachmentCount: 0 });
  expect((await request.patch(endpoint, { headers: { origin }, data: { text: 'Stale description', version: 1 } })).status()).toBe(409);
  const discussion = await (await request.get(`${endpoint}/discussion`)).json();
  expect(discussion.messages).toHaveLength(1);
  expect(discussion.messages[0]).toMatchObject({ body: 'Description updated:\nOrder 100 bags in the agreed size.', authorName: 'Editor' });
  // Counts include legacy updates and files, and survive a later status change.
  await request.post(`${endpoint}/discussion`, { headers: { origin }, multipart: { kind: 'update', body: 'Supplier called.', files: quoteFile } });
  const moved = await request.patch(endpoint, { headers: { origin }, data: { status: 'doing', version: 2 } });
  expect((await moved.json()).task).toMatchObject({ messageCount: 2, attachmentCount: 1 });
  const plan = await (await request.get('/api/plan')).json();
  expect(plan.milestones[0].tasks[0]).toMatchObject({ messageCount: 2, attachmentCount: 1 });
  await signIn(request, 'parent@example.com');
  expect((await request.patch(endpoint, { headers: { origin }, data: { text: 'Reader edit', version: 3 } })).status()).toBe(403);
});

test('card details preserve filters and reconcile concurrent description edits without losing the draft', async ({ page }) => {
  await signIn(page.request, 'organiser@example.com');
  await page.goto('/branding-plan/board');
  await page.getByLabel('Filter by owner').selectOption('estelle');
  const opener = page.getByRole('button', { name: /^Open task:/ }).first();
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Edit description' }).click();
  await page.getByLabel('Description', { exact: true }).fill('Ask Kostomize for a quote for 100 stickers.');
  const patch = await page.request.patch('/api/plan/tasks/design-1', { headers: { origin }, data: { text: 'Ask for a paper bag printing quote.', version: 1 } });
  expect(patch.status()).toBe(200);
  await page.getByRole('button', { name: 'Save description' }).click();
  await expect(page.getByRole('alert')).toContainText('Someone changed this task.');
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('Ask Kostomize for a quote for 100 stickers.');
  await expect(dialog.getByText('Ask for a paper bag printing quote.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save description' })).toBeDisabled();
  await page.getByRole('button', { name: 'Keep my draft' }).click();
  await page.getByRole('button', { name: 'Save description' }).click();
  await expect(page.getByRole('status')).toHaveText('Description saved.');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.getByLabel('Filter by owner')).toHaveValue('estelle');
  const card = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Open task: Ask Kostomize for a quote for 100 stickers.', exact: true }) });
  await expect(card).toContainText('2 comments');
  await card.getByLabel('Status', { exact: true }).selectOption('doing');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Design · Doing', exact: true })).toContainText('2 comments');
  await page.getByRole('tab', { name: 'Timeline', exact: true }).click();
  await page.getByRole('button', { name: 'Open task: Ask Kostomize for a quote for 100 stickers.', exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Ask Kostomize for a quote for 100 stickers.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tab', { name: 'Timeline', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Board', exact: true }).click();
  await page.getByRole('button', { name: 'Open task: Ask Kostomize for a quote for 100 stickers.', exact: true }).dragTo(page.getByRole('region', { name: 'Design · Review', exact: true }), { sourcePosition: { x: 12, y: 12 }, targetPosition: { x: 12, y: 30 } });
  await expect(page.getByRole('region', { name: 'Design · Review', exact: true })).toContainText('Ask Kostomize for a quote for 100 stickers.');
  await expect(dialog).toHaveCount(0);
});

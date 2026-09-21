import { test, expect } from "@playwright/test";
import pg from "pg";
import { signIn } from "./auth-helpers";
import { planMilestones, planPeople } from "../src/data/plan-tasks";
const db=new pg.Pool({connectionString:process.env.DUCKIES_DATABASE_URL});
const origin="http://127.0.0.1:4329";
const seededTasks=planMilestones.reduce((n,m)=>n+m.tasks.length,0);

test.beforeEach(async()=>{
  await db.query('TRUNCATE club_member_archive,plan_task_event, plan_task, plan_milestone, plan_person, branding_access_event, branding_access, club_member, "user", "session", account, verification, "rateLimit" CASCADE');
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

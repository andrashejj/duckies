import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { signIn } from "./auth-helpers";
import { clubToday, type TrainingBoard } from "../src/lib/club-points";
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(db, { disposeExternalPool: false }) });
const origin = "http://127.0.0.1:4329", owner = "andras@hejj.xyz", parent = "parent@example.com";
const today = clubToday();
const dayBefore = (date: string) => new Date(new Date(`${date}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
const previous = dayBefore(today);
const post = (data: unknown) => ({ headers: { origin }, data });
let alice: string, ben: string, ownerRequest: APIRequestContext;
const board = async (request: APIRequestContext, date = today): Promise<TrainingBoard> => (await request.get(`/api/admin/training?date=${date}`)).json();
const check = (request: APIRequestContext, kidId = alice, present = true, date = today) => request.patch("/api/admin/training", post({ date, kidId, present }));
test.beforeEach(async ({ playwright }) => {
  await db.query('TRUNCATE club_member_archive,club_kid,club_member,club_parent_profile,club_training,club_point_rule,"user","session",account,verification,"rateLimit",shop_request_limit,"Drop","Product","Order",cup_heat,cup_judge,cup_ticker CASCADE');
  await db.query("INSERT INTO club_point_rule(effective_at,training,granola,cup,recorded_by) VALUES('1970-01-01',10,5,20,'test')");
  await db.query("INSERT INTO club_member(email,role) VALUES($1,'organiser'),($2,'member'),('other@example.com','organiser')", [owner, parent]);
  const kids = await db.query("INSERT INTO club_kid(name) VALUES('Alice Duckie'),('Ben Duckie') RETURNING id,name");
  alice = kids.rows.find(kid => kid.name === "Alice Duckie").id;
  ben = kids.rows.find(kid => kid.name === "Ben Duckie").id;
  await db.query("INSERT INTO club_guardian_access(kid_id,email,name,relationship,phone,updated_by) VALUES($1,$2,'Alice Parent','Mother','5555',$3)", [alice,parent,owner]);
  ownerRequest = await playwright.request.newContext({ baseURL: origin }); await signIn(ownerRequest,owner);
});
test.afterEach(async () => { await ownerRequest.dispose(); });
test.afterAll(async () => { await prisma.$disconnect(); await db.end(); });

test("only Andras can record attendance; retries and undo preserve one award and an audit trail", async ({ request }) => {
  expect(clubToday(new Date("2026-09-20T21:00:00Z"))).toBe("2026-09-21");
  expect((await request.get("/api/admin/training")).status()).toBe(401);
  expect((await check(request)).status()).toBe(401);
  await signIn(request,"other@example.com");
  expect((await board(request)).canEdit).toBe(false);
  expect((await check(request)).status()).toBe(403);
  expect((await request.put("/api/admin/point-rules",post({training:100,granola:100,cup:100}))).status()).toBe(403);
  expect((await ownerRequest.patch("/api/admin/training",{headers:{origin:"https://evil.example"},data:{date:today,kidId:alice,present:true}})).status()).toBe(403);
  expect((await check(ownerRequest,alice,true,"2099-01-01")).status()).toBe(400);
  expect((await check(ownerRequest,alice,true,"2026-02-30")).status()).toBe(400);
  expect((await check(ownerRequest,randomUUID())).status()).toBe(404);
  const repeated = await Promise.all([check(ownerRequest),check(ownerRequest),check(ownerRequest)]);
  expect(repeated.map(response => response.status())).toEqual([200,200,200]);
  expect((await board(ownerRequest)).kids.find(kid => kid.id===alice)?.points.total).toBe(10);
  expect((await db.query("SELECT * FROM club_attendance_event")).rowCount).toBe(1);
  expect((await check(ownerRequest,alice,false)).status()).toBe(200);
  expect((await board(ownerRequest)).kids.find(kid => kid.id===alice)?.points.total).toBe(0);
  expect((await check(ownerRequest)).status()).toBe(200);
  expect((await board(ownerRequest)).kids.find(kid => kid.id===alice)?.points.total).toBe(10);
  expect((await db.query("SELECT present,recorded_by FROM club_attendance_event ORDER BY recorded_at")).rows).toEqual([{present:true,recorded_by:owner},{present:false,recorded_by:owner},{present:true,recorded_by:owner}]);
  await db.query("UPDATE club_kid SET archived_at=now() WHERE id=$1",[ben]);
  expect((await check(ownerRequest,ben)).status()).toBe(404);
});

test("mobile admin checks today's roll, corrects a past training and sees errors without a false check-in", async ({ page }) => {
  await page.context().addCookies((await ownerRequest.storageState()).cookies);
  await page.setViewportSize({width:390,height:844});
  await page.goto("/admin/training");
  await expect(page.getByRole("link",{name:"Training & points",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.getByLabel("Training date",{exact:true})).toHaveValue(today);
  const aliceBox = page.getByRole("checkbox",{name:"Present: Alice Duckie",exact:true});
  await aliceBox.check();
  await expect(page.getByRole("status")).toContainText("Alice Duckie checked in. 10 points recorded.");
  await expect(page.locator("[data-attendance-count]")).toHaveText("1 / 2 here");
  await page.getByLabel("Find a duckie").fill("Alice Parent");
  await expect(page.getByRole("checkbox")).toHaveCount(1);
  await page.getByLabel("Find a duckie").fill("");
  await page.screenshot({path:"test-results/training-mobile.png",fullPage:true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.route("**/api/admin/training",route => route.fulfill({status:503,json:{error:"Test service unavailable"}}));
  await page.getByRole("checkbox",{name:"Present: Ben Duckie"}).click();
  await expect(page.getByRole("alert")).toContainText("Test service unavailable");
  await expect(page.getByRole("checkbox",{name:"Present: Ben Duckie"})).not.toBeChecked();
  await page.unroute("**/api/admin/training");
  await page.getByLabel("Training date",{exact:true}).fill(previous);
  await expect(aliceBox).toBeEnabled(); await aliceBox.check();
  await expect(page.getByRole("status")).toContainText("Alice Duckie checked in.");
  await page.getByRole("button",{name:"Today",exact:true}).click();
  await expect(aliceBox).toBeEnabled(); await aliceBox.uncheck();
  await expect(page.getByRole("status")).toContainText("Training points removed.");
  await page.reload(); await expect(aliceBox).not.toBeChecked();
  const pointRow = page.getByRole("row").filter({hasText:"Alice Duckie"});
  await expect(pointRow).toContainText("10");
  await page.setViewportSize({width:1280,height:1000});
  await page.screenshot({path:"test-results/training-desktop.png",fullPage:true});
});

test("new point values preserve previous training values and family history stays private", async ({ page,request }) => {
  await check(ownerRequest,alice,true,previous);
  expect((await ownerRequest.put("/api/admin/point-rules",post({training:15,granola:8,cup:30}))).status()).toBe(200);
  await check(ownerRequest,ben,true,previous);
  await check(ownerRequest,alice,true,today);
  const state = await board(ownerRequest);
  expect(state.kids.find(kid=>kid.id===alice)?.points).toMatchObject({total:25,training:25,granola:0,cup:0});
  expect(state.kids.find(kid=>kid.id===ben)?.points.total).toBe(10);
  await signIn(page.request,parent);
  expect((await page.request.get("/api/admin/training")).status()).toBe(403);
  expect((await check(page.request)).status()).toBe(403);
  const family = await (await page.request.get("/api/family")).json();
  expect(family.kids).toHaveLength(1); expect(family.kids[0].points.total).toBe(25);
  await page.goto("/members/profile");
  await page.getByText("★ 25 club points",{exact:true}).click();
  await expect(page.getByText("Training attended")).toHaveCount(2);
  expect(await page.content()).not.toContain("Ben Duckie");
  expect(await (await request.get("/")).text()).not.toContain("Alice Duckie");
});

test("only paid granola earns points for selected kids; catalogue edits and retries cannot change or duplicate past awards", async ({ request }) => {
  await signIn(request,parent);
  const drop=await prisma.drop.create({data:{slug:"points-drop",name:"Points drop",status:"LIVE"}});
  const product=await prisma.product.create({data:{sku:"GRANOLA-TEST",slug:"test-granola",name:"Test granola",kind:"Bag",description:"Granola",priceCents:10000,category:"GRANOLA",sizes:[],dropId:drop.id}});
  const reserve = async () => {
    const res=await request.post("/api/reserve",post({requestKey:randomUUID(),customer:{name:"Parent",email:parent},familyKidIds:[alice],lines:[{productId:product.id,quantity:2}]}));
    expect(res.status()).toBe(200);return (await res.json()).orderId as string;
  };
  const first=await reserve();
  // The database also snapshots lines created without the new field, as the
  // previous app does while a deployment is rolling out.
  const legacyLine = await prisma.orderItem.create({data:{orderId:first,productId:product.id,sku:product.sku,nameSnapshot:product.name,priceCentsSnapshot:10000,quantity:1,lineTotalCents:10000}});
  expect(legacyLine.granolaBags).toBe(1);
  await prisma.orderItem.delete({where:{id:legacyLine.id}});
  expect((await board(ownerRequest)).kids.find(kid=>kid.id===alice)?.points.total).toBe(0);
  const paid=()=>ownerRequest.post(`/api/admin/orders/${first}/paid`,post({}));
  expect((await paid()).status()).toBe(200);expect((await paid()).status()).toBe(400);
  expect((await board(ownerRequest)).kids.find(kid=>kid.id===alice)?.points.granola).toBe(10);
  expect((await board(ownerRequest)).kids.find(kid=>kid.id===ben)?.points.total).toBe(0);
  await ownerRequest.put("/api/admin/point-rules",post({training:10,granola:8,cup:20}));
  const second=await reserve();await ownerRequest.post(`/api/admin/orders/${second}/paid`,post({}));
  expect((await board(ownerRequest)).kids.find(kid=>kid.id===alice)?.points.granola).toBe(26);
  await prisma.product.update({where:{id:product.id},data:{category:"APPAREL"}});
  expect((await board(ownerRequest)).kids.find(kid=>kid.id===alice)?.points.granola).toBe(26);
  const third=await reserve();await ownerRequest.post(`/api/admin/orders/${third}/paid`,post({}));
  expect((await board(ownerRequest)).kids.find(kid=>kid.id===alice)?.points.granola).toBe(26);
  expect((await ownerRequest.post(`/api/admin/orders/${first}/transition`,post({to:"CANCELLED",sendEmail:false}))).status()).toBe(200);
  expect((await board(ownerRequest)).kids.find(kid=>kid.id===alice)?.points.granola).toBe(16);
});

test("Cup participation earns points once per edition, regardless of runs, heats or judges", async () => {
  const addHeat = async (edition:string, number:number) => {
    await db.query("INSERT INTO cup_event(edition) VALUES($1) ON CONFLICT DO NOTHING",[edition]);
    return (await db.query("INSERT INTO cup_heat(edition,round,number) VALUES($1,1,$2) RETURNING id",[edition,number])).rows[0].id;
  };
  const heat = await addHeat("points-cup",1), otherHeat = await addHeat("points-cup",2);
  expect((await board(ownerRequest)).kids.find(kid=>kid.id===alice)?.points.cup).toBe(0);
  for (const heatId of [heat,otherHeat]) for (const judge of ["a@example.com","b@example.com"]) for (const wave of [1,2])
    await db.query("INSERT INTO cup_wave(heat_id,kid_id,judge_email,wave,score) VALUES($1,$2,$3,$4,5)",[heatId,alice,judge,wave]);
  expect((await board(ownerRequest)).kids.find(kid=>kid.id===alice)?.points.cup).toBe(20);
  await ownerRequest.put("/api/admin/point-rules",post({training:10,granola:5,cup:30}));
  const next=await addHeat("points-cup-next",1);
  await db.query("INSERT INTO cup_wave(heat_id,kid_id,judge_email,wave,score) VALUES($1,$2,'a@example.com',1,1)",[next,alice]);
  expect((await board(ownerRequest)).kids.find(kid=>kid.id===alice)?.points.cup).toBe(50);
  expect((await board(ownerRequest)).kids.find(kid=>kid.id===ben)?.points.cup).toBe(0);
});

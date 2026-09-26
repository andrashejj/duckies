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
const roll = async (request: APIRequestContext, date = today): Promise<TrainingBoard> => (await request.get(`/api/training?date=${date}`)).json();
// An organiser's view of one duckie's club points: the total and how it is made up.
const points = async (request: APIRequestContext, kidId: string) => { const kid = (await roll(request)).kids.find(kid => kid.id === kidId)!; return { total: kid.points, ...kid.split! }; };
const check = (request: APIRequestContext, kidId = alice, present = true, date = today) => request.patch("/api/training", post({ date, sessionType: "sunset", kidIds: [kidId], present }));
test.beforeEach(async ({ playwright }) => {
  await db.query('TRUNCATE club_member_archive,club_kid,club_member,club_parent_profile,club_coach,club_training,club_point_rule,"user","session",account,verification,"rateLimit",shop_request_limit,"Drop","Product","Order",cup_heat,cup_judge,cup_ticker CASCADE');
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

test("organisers call the roll, members only read it and only Andras sets point values; retries and undo preserve one award and an audit trail", async ({ request }) => {
  expect(clubToday(new Date("2026-09-20T21:00:00Z"))).toBe("2026-09-21");
  expect((await request.get("/api/training")).status()).toBe(401);
  expect((await check(request)).status()).toBe(401);
  await signIn(request,parent);
  expect((await roll(request)).access).toBe("member");
  expect((await check(request)).status()).toBe(403);
  await signIn(request,"other@example.com");
  expect((await request.put("/api/admin/point-rules",post({training:100,sunrise:100,granola:100,cup:100}))).status()).toBe(403);
  expect((await roll(request)).access).toBe("organiser");
  expect((await check(request,ben)).status()).toBe(200);
  expect((await ownerRequest.patch("/api/training",{headers:{origin:"https://evil.example"},data:{date:today,sessionType:"sunset",kidIds:[alice],present:true}})).status()).toBe(403);
  expect((await check(ownerRequest,alice,true,"2099-01-01")).status()).toBe(400);
  expect((await check(ownerRequest,alice,true,"2026-02-30")).status()).toBe(400);
  expect((await ownerRequest.patch("/api/training",post({date:today,sessionType:"sunset",kidIds:[],present:true}))).status()).toBe(400);
  expect((await check(ownerRequest,randomUUID())).status()).toBe(404);
  const repeated = await Promise.all([check(ownerRequest),check(ownerRequest),check(ownerRequest)]);
  expect(repeated.map(response => response.status())).toEqual([200,200,200]);
  expect((await points(ownerRequest,alice)).total).toBe(10);
  expect((await db.query("SELECT * FROM club_attendance_event WHERE kid_id=$1",[alice])).rowCount).toBe(1);
  // A batch with a departed or unknown duckie changes nobody.
  expect((await ownerRequest.patch("/api/training",post({date:today,sessionType:"sunset",kidIds:[alice,randomUUID()],present:false}))).status()).toBe(404);
  expect((await roll(ownerRequest)).kids.map(kid => kid.status)).toEqual(["here","here"]);
  expect((await check(ownerRequest,alice,false)).status()).toBe(200);
  expect((await points(ownerRequest,alice)).total).toBe(0);
  expect((await check(ownerRequest)).status()).toBe(200);
  expect((await points(ownerRequest,alice)).total).toBe(10);
  expect((await db.query("SELECT present,recorded_by FROM club_attendance_event WHERE kid_id=$1 ORDER BY recorded_at",[alice])).rows).toEqual([{present:true,recorded_by:owner},{present:false,recorded_by:owner},{present:true,recorded_by:owner}]);
  expect((await db.query("SELECT recorded_by FROM club_attendance_event WHERE kid_id=$1",[ben])).rows).toEqual([{recorded_by:"other@example.com"}]);
  await db.query("UPDATE club_kid SET archived_at=now() WHERE id=$1",[ben]);
  expect((await check(ownerRequest,ben)).status()).toBe(404);
});

test("mobile organiser calls today's roll one by one, corrects a past training and keeps a failed save off the roll", async ({ page }) => {
  await page.context().addCookies((await ownerRequest.storageState()).cookies);
  await page.setViewportSize({width:390,height:844});
  await page.goto("/admin/training");
  await expect(page).toHaveURL(/\/members\/training\?date=|\/members\/training$/);
  await expect(page.getByRole("navigation",{name:"Mobile member navigation"}).getByRole("link",{name:"Training",exact:true})).toHaveAttribute("aria-current","page");
  const rollCall = page.getByRole("region",{name:"Roll call"});
  const leaderboard = page.getByRole("list",{name:"Club points leaderboard"});
  await expect(rollCall.getByLabel("Training date",{exact:true})).toHaveValue(today);
  await rollCall.getByRole("button",{name:"Here: Alice Duckie"}).click();
  await expect(rollCall.getByRole("status")).toContainText("Alice Duckie is here. +10 points.");
  await expect(rollCall.locator("[data-roll-count]")).toHaveText("1 here · 0 away · 1 to call");
  await expect(leaderboard.getByRole("listitem").first()).toContainText("Alice Duckie");
  await expect(leaderboard.getByRole("listitem").first()).toContainText("10pts");
  await page.screenshot({path:"test-results/training-mobile.png",fullPage:true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.route("**/api/training",route => route.request().method()==="PATCH" ? route.fulfill({status:503,json:{error:"Test service unavailable"}}) : route.continue());
  await rollCall.getByRole("button",{name:"Here: Ben Duckie"}).click();
  await expect(rollCall.getByRole("alert")).toContainText("Test service unavailable Ben Duckie is back as before.");
  await expect(rollCall.locator("[data-roll-count]")).toHaveText("1 here · 0 away · 1 to call");
  await page.unroute("**/api/training");
  await rollCall.getByRole("button",{name:"Keep calling"}).click();
  await expect(rollCall.getByRole("button",{name:"Here: Ben Duckie"})).toHaveAttribute("aria-pressed","false");
  await rollCall.getByLabel("Training date",{exact:true}).fill(previous);
  const aliceHere = rollCall.getByRole("button",{name:"Here: Alice Duckie"});
  await expect(aliceHere).toHaveAttribute("aria-pressed","false"); await aliceHere.click();
  await expect(rollCall.getByRole("status")).toContainText("Alice Duckie is here.");
  await expect(rollCall).toHaveAttribute("data-saving","false");
  await rollCall.getByRole("button",{name:/^Today/}).click();
  await rollCall.getByRole("button",{name:"Whole crew",exact:true}).click();
  const aliceTile = rollCall.getByRole("button",{name:"Alice Duckie",exact:true});
  await expect(aliceTile).toHaveAttribute("aria-pressed","true"); await aliceTile.click();
  await expect(rollCall.getByRole("status")).toContainText("Alice Duckie is away.");
  await expect(rollCall).toHaveAttribute("data-saving","false");
  await page.reload(); await expect(aliceTile).toHaveAttribute("aria-pressed","false");
  await expect(leaderboard.getByRole("listitem").filter({hasText:"Alice Duckie"})).toContainText("10pts");
  await page.setViewportSize({width:1280,height:1000});
  await page.screenshot({path:"test-results/training-desktop.png",fullPage:true});
});

test("new point values preserve previous training values; members see totals and family history stays private", async ({ page,request }) => {
  await check(ownerRequest,alice,true,previous);
  expect((await ownerRequest.put("/api/admin/point-rules",post({training:15,sunrise:5,granola:8,cup:30}))).status()).toBe(200);
  await check(ownerRequest,ben,true,previous);
  await check(ownerRequest,alice,true,today);
  expect(await points(ownerRequest,alice)).toMatchObject({total:25,training:25,granola:0,cup:0});
  expect((await points(ownerRequest,ben)).total).toBe(10);
  await signIn(page.request,parent);
  // Members see the leaderboard totals, never how another family's total is made up.
  const shared = await roll(page.request);
  expect(shared.kids.map(kid => [kid.name,kid.points,kid.split,kid.mine,kid.guardians])).toEqual([["Alice Duckie",25,null,true,""],["Ben Duckie",10,null,false,""]]);
  expect((await check(page.request)).status()).toBe(403);
  const family = await (await page.request.get("/api/family")).json();
  expect(family.kids).toHaveLength(1); expect(family.kids[0].points.total).toBe(25);
  await page.goto("/members/profile");
  await page.getByText("★ 25 club points",{exact:true}).click();
  await expect(page.getByText("Sunset Duckies attended")).toHaveCount(2);
  expect(await page.content()).not.toContain("Ben Duckie");
  expect(await (await request.get("/")).text()).not.toContain("Alice Duckie");
});

test("granola earns points as soon as an order is placed; catalogue edits and retries cannot change or duplicate past awards", async ({ request }) => {
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
  // Points land the moment the order is placed, well before anyone marks it paid.
  expect((await points(ownerRequest,alice)).granola).toBe(10);
  expect((await points(ownerRequest,ben)).total).toBe(0);
  const paid=()=>ownerRequest.post(`/api/admin/orders/${first}/paid`,post({}));
  expect((await paid()).status()).toBe(200);expect((await paid()).status()).toBe(400);
  expect((await points(ownerRequest,alice)).granola).toBe(10);
  await ownerRequest.put("/api/admin/point-rules",post({training:10,sunrise:5,granola:8,cup:20}));
  const second=await reserve();
  expect((await points(ownerRequest,alice)).granola).toBe(26);
  await ownerRequest.post(`/api/admin/orders/${second}/paid`,post({}));
  expect((await points(ownerRequest,alice)).granola).toBe(26);
  await prisma.product.update({where:{id:product.id},data:{category:"APPAREL"}});
  const third=await reserve();
  expect((await points(ownerRequest,alice)).granola).toBe(26);
  await ownerRequest.post(`/api/admin/orders/${third}/paid`,post({}));
  expect((await points(ownerRequest,alice)).granola).toBe(26);
  expect((await ownerRequest.post(`/api/admin/orders/${first}/transition`,post({to:"CANCELLED",sendEmail:false}))).status()).toBe(200);
  expect((await points(ownerRequest,alice)).granola).toBe(16);
});

test("Sunrise Duckies is a separate, lower-value session that can run alongside Sunset Duckies on the same date", async ({ request }) => {
  await signIn(request,owner);
  expect((await roll(request)).sessionType).toBe("sunset");
  expect((await request.patch("/api/training",post({date:today,sessionType:"sunset",kidIds:[alice],present:true}))).status()).toBe(200);
  expect((await request.patch("/api/training",post({date:today,sessionType:"sunrise",kidIds:[alice],present:true}))).status()).toBe(200);
  const sunset=await roll(request,today);
  const sunrise=await (await request.get(`/api/training?date=${today}&sessionType=sunrise`)).json() as TrainingBoard;
  expect(sunset.sessionPoints).toBe(10); expect(sunrise.sessionPoints).toBe(5);
  expect(sunset.kids.find(kid => kid.id===alice)!.status).toBe("here");
  expect(sunrise.kids.find(kid => kid.id===alice)!.status).toBe("here");
  expect((await points(request,alice)).total).toBe(15);
});

test("Cup participation earns points once per edition, regardless of runs, heats or judges", async () => {
  const addHeat = async (edition:string, number:number) => {
    await db.query("INSERT INTO cup_event(edition) VALUES($1) ON CONFLICT DO NOTHING",[edition]);
    return (await db.query("INSERT INTO cup_heat(edition,round,number) VALUES($1,1,$2) RETURNING id",[edition,number])).rows[0].id;
  };
  const heat = await addHeat("points-cup",1), otherHeat = await addHeat("points-cup",2);
  expect((await points(ownerRequest,alice)).cup).toBe(0);
  for (const heatId of [heat,otherHeat]) for (const judge of ["a@example.com","b@example.com"]) for (const wave of [1,2])
    await db.query("INSERT INTO cup_wave(heat_id,kid_id,judge_email,wave,score) VALUES($1,$2,$3,$4,5)",[heatId,alice,judge,wave]);
  expect((await points(ownerRequest,alice)).cup).toBe(20);
  await ownerRequest.put("/api/admin/point-rules",post({training:10,sunrise:5,granola:5,cup:30}));
  const next=await addHeat("points-cup-next",1);
  await db.query("INSERT INTO cup_wave(heat_id,kid_id,judge_email,wave,score) VALUES($1,$2,'a@example.com',1,1)",[next,alice]);
  expect((await points(ownerRequest,alice)).cup).toBe(50);
  expect((await points(ownerRequest,ben)).cup).toBe(0);
});

import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { createPrismaClient } from "../src/lib/prisma-factory";
import { signIn, codeFor } from "./auth-helpers";
import { submission } from "./registration-helpers";
import { WAIVER_VERSION } from "../src/lib/registration/policy";
const origin = "http://127.0.0.1:4329";
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const prisma = createPrismaClient();
const parent = "parent@example.com", second = "second@example.com", adminEmail = "organiser@example.com";
const details = (email = second) => ({ name: "Second Parent", email, phone: "+230 5555 4567", relationship: "Mother" });
const post = (data?: unknown) => ({ headers: { origin }, data });
async function invitations(email: string) {
  const text=await readFile(process.env.DUCKIES_TEST_MAIL_FILE!,"utf8");
  return text.trim().split("\n").map(line=>JSON.parse(line)).filter(mail=>mail.to.includes(email)&&mail.subject==="You're invited to My family — Sunset Duckies");
}

let admin: APIRequestContext, guest: APIRequestContext, productId: string;
async function kid(name: string, extra = false) {
  const id = (await (await admin.post("/api/kids", post({ name }))).json()).kid.id;
  const link = await (await admin.post(`/api/kids/${id}/link`, post())).json();
  const result = await guest.post("/api/registration", { headers: { origin, authorization: `Bearer ${new URLSearchParams(new URL(link.url).hash.slice(1)).get("token")}` }, data: submission({
    version: WAIVER_VERSION, childName:name,dateOfBirth:"2017-10-01", sessionsPerWeek:"2",
    guardians:[{name:"First Parent",email:parent,phone:"+230 5555 1234",relationship:"Father"},...(extra ? [details()] : [])],
    medicalNotes:"Private allergy note",emergencyName:"Emergency Contact",emergencyRelationship:"Aunt",emergencyPhone:"+230 5555 9999",
    media:"yes",parentInWater:true,swimming:true,reef:true,gear:true,waiverAccepted:true,electronicConsent:true,signerName:"First Parent",signature:[],
  }) });
  expect(result.status()).toBe(201); return id as string;
}
async function reserve(request: APIRequestContext, familyKidIds?: string[]) {
  const response = await request.post("/api/reserve", post({ requestKey: randomUUID(), customer: {name:"First Parent",email:parent}, lines:[{productId,quantity:1}], ...(familyKidIds ? {familyKidIds} : {}) }));
  expect(response.status()).toBe(200); return response.json();
}
test.beforeEach(async ({ playwright }) => {
  await db.query('TRUNCATE club_member_archive,club_parent_profile,club_kid,club_member,"user","session",account,verification,"rateLimit","Drop","Product","Order",shop_request_limit CASCADE');
  await db.query("INSERT INTO club_member(email,role) VALUES($1,'organiser'),($2,'member'),('stranger@example.com','member')",[adminEmail,parent]);
  admin = await playwright.request.newContext({baseURL:origin}); guest=await playwright.request.newContext({baseURL:origin});
  await signIn(admin,adminEmail);
  const drop=await prisma.drop.create({data:{slug:"family-drop",name:"Family drop",status:"LIVE"}});
  productId=(await prisma.product.create({data:{sku:"FAMILY-KIT",slug:"family-kit",name:"Family Kit",kind:"Kit",description:"Shared family kit",priceCents:10000,category:"ACCESSORIES",sizes:[],dropId:drop.id}})).id;
});
test.afterEach(async()=>{await admin.dispose();await guest.dispose();});
test.afterAll(async()=>{await db.end();await prisma.$disconnect();});

test("all registered guardians can sign in to the family and shop without receiving club admin or roster access",async({page})=>{
  const id=await kid("Shared Duckie",true);
  await signIn(page.request,second);
  const session=await (await page.request.get("/api/session")).json();
  expect(session).toMatchObject({signedIn:true,member:false,family:true,admin:false,home:"/members/profile"});
  await page.goto("/members/profile");
  await expect(page.getByRole("region",{name:"Family guardians"})).toContainText("First Parent");
  await expect(page.getByRole("region",{name:"Family guardians"})).toContainText("Second Parent");
  expect((await (await page.request.get("/api/family")).json()).kids.map((k:{id:string})=>k.id)).toEqual([id]);
  expect((await page.request.get("/members")).status()).toBe(403);
  expect((await page.request.get("/admin/kids")).status()).toBe(403);
  expect((await page.request.get("/api/kids")).status()).toBe(401);
  expect(await (await page.request.get("/shop/family-kit")).text()).toContain("Share with family");
  const order=await reserve(page.request,[id]);
  expect((await page.request.get(`/orders/${order.orderId}`)).status()).toBe(200);
  const waiver=(await db.query("SELECT id FROM club_signed_waiver WHERE kid_id=$1",[id])).rows[0].id;
  expect((await page.request.get(`/api/waivers/${waiver}`)).status()).toBe(200);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:"test-results/family-guardians-mobile.png",fullPage:true});
});

test("adding a guardian shares only chosen kids and their orders; changes preserve signed records",async({page,playwright})=>{
  const first=await kid("First Duckie"), other=await kid("Other Duckie");
  const before=(await db.query("SELECT id,payload_sha256,pdf_sha256 FROM club_signed_waiver ORDER BY id")).rows;
  await signIn(page.request,parent);
  const shared=await reserve(page.request,[first]), privateOrder=await reserve(page.request,[other]);
  const mailCount=(await invitations(second)).length;
  await page.goto("/members/profile");
  const area=page.getByRole("region",{name:"Family guardians"});
  await area.getByText("Add a legal guardian",{exact:true}).click();
  await area.getByLabel("Guardian name",{exact:true}).fill("Second Parent");
  await area.getByLabel("Guardian email",{exact:true}).fill(second);
  await area.getByLabel("Phone",{exact:true}).fill("+230 5555 4567");
  await area.getByLabel("Relationship",{exact:true}).fill("Mother");
  await area.getByRole("checkbox",{name:"Other Duckie",exact:true}).uncheck();
  await area.getByRole("checkbox",{name:/I confirm/}).check();
  await area.getByRole("button",{name:"Add guardian",exact:true}).click();
  await expect(area.getByRole("status")).toContainText(`Guardian added. Sign-in invitation sent to ${second}.`);
  const mails=await invitations(second);expect(mails).toHaveLength(mailCount+1);
  const invitation=mails.at(-1)!;
  expect(invitation.text).toContain(second);expect(invitation.text).toContain("six-digit sign-in code");
  for(const secret of ["First Duckie","Other Duckie","Private allergy note",shared.guestToken])expect(invitation.text).not.toContain(secret);
  const url=new URL(invitation.text.match(/https?:\/\/\S+/)![0]);
  expect(url.origin).toBe(origin);expect(url.pathname).toBe("/login");expect(url.searchParams.get("next")).toBe("/members/profile");
  await area.getByRole("button",{name:/Resend invitation to Second Parent/}).click();
  await expect(area.getByRole("status")).toHaveText(`Sign-in invitation sent to ${second}.`);
  expect(await invitations(second)).toHaveLength(mailCount+2);

  const co=await playwright.request.newContext({baseURL:origin});await signIn(co,second);
  expect((await (await co.get("/api/family")).json()).kids.map((k:{id:string})=>k.id)).toEqual([first]);
  expect((await (await co.get("/api/cup/kids")).json()).kids.map((k:{id:string})=>k.id)).toEqual([first]);
  expect((await co.post(`/api/cup/kids/${first}`,post())).status()).toBe(201);
  expect((await co.get(`/api/family/kids/${other}/photo`)).status()).toBe(404);
  expect((await co.post("/api/family/guardians",post({kidIds:[other],guardian:details("intruder@example.com"),confirm:true}))).status()).toBe(404);
  const countBefore=await prisma.order.count();
  await prisma.product.update({where:{id:productId},data:{stock:3}});
  expect((await co.post("/api/reserve",post({requestKey:randomUUID(),customer:{name:"Second Parent",email:second},familyKidIds:[other],lines:[{productId,quantity:1}]}))).status()).toBe(400);
  expect(await prisma.order.count()).toBe(countBefore);
  expect((await prisma.product.findUniqueOrThrow({where:{id:productId}})).stock).toBe(3);
  const history=await (await co.get("/account/orders")).text();
  expect(history).toContain(`/orders/${shared.orderId}`);expect(history).not.toContain(privateOrder.orderId);expect(history).not.toContain(shared.guestToken);
  expect((await co.get(`/orders/${shared.orderId}`)).status()).toBe(200);
  expect((await co.get(`/orders/${privateOrder.orderId}`)).status()).toBe(404);
  expect((await guest.get(`/orders/${shared.orderId}`)).status()).toBe(404);
  // Once removed, an already-signed-in guardian loses the shared family and receipts immediately.
  expect((await page.request.delete("/api/family/guardians",post({kidIds:[first],email:second}))).status()).toBe(200);
  expect((await (await co.get("/api/family")).json()).kids).toEqual([]);
  expect((await co.get(`/orders/${shared.orderId}`)).status()).toBe(404);
  expect((await co.get("/members/profile")).status()).toBe(403);
  expect((await co.post("/api/reserve",post({}))).status()).toBe(403);
  expect((await db.query("SELECT id,payload_sha256,pdf_sha256 FROM club_signed_waiver ORDER BY id")).rows).toEqual(before);
  await co.dispose();
});

test("admin can link pending kids; family writes reject outsiders, missing consent, forged requests and partial batches",async({request,playwright})=>{
  const id=(await (await admin.post("/api/kids",post({name:"Pending Duckie"}))).json()).kid.id;
  expect((await admin.post("/api/family/guardians",post({kidIds:[id],guardian:{...details(parent),name:"First Parent"},confirm:true}))).status()).toBe(201);
  await signIn(request,parent);
  expect((await (await request.get("/api/family")).json()).kids).toMatchObject([{id,waiver:null}]);
  expect((await request.post("/api/family/guardians",post({kidIds:[id],guardian:details()}))).status()).toBe(400);
  expect((await request.post("/api/family/guardians",{headers:{origin:"https://evil.example"},data:{kidIds:[id],guardian:details(),confirm:true}})).status()).toBe(403);
  expect((await guest.post("/api/family/guardians",post({kidIds:[id],guardian:details(),confirm:true}))).status()).toBe(401);
  const unrelated=(await (await admin.post("/api/kids",post({name:"Unrelated Duckie"}))).json()).kid.id;
  expect((await request.post("/api/family/guardians",post({kidIds:[id,unrelated],guardian:details(),confirm:true}))).status()).toBe(404);
  expect((await db.query("SELECT * FROM club_current_guardian WHERE email=$1",[second])).rowCount).toBe(0);
  expect((await request.delete("/api/family/guardians",post({kidIds:[id],email:parent}))).status()).toBe(400);
  for(let n=0;n<3;n++)expect((await request.post("/api/family/guardians",post({kidIds:[id],guardian:details(`co${n}@example.com`),confirm:true}))).status()).toBe(201);
  expect((await request.post("/api/family/guardians",post({kidIds:[id],guardian:details(),confirm:true}))).status()).toBe(400);
  const stranger=await playwright.request.newContext({baseURL:origin});await signIn(stranger,"stranger@example.com");
  expect((await stranger.get(`/api/family/guardians?kidId=${id}`)).status()).toBe(404);
  await stranger.dispose();
});

test("signed-guardian revocation stays revoked and legacy orders gain family attribution without changing receipts",async({request,playwright})=>{
  const id=await kid("Legacy Duckie",true);await signIn(request,parent);
  const order=await reserve(request,[id]);
  await db.query("DELETE FROM club_order_family WHERE order_id=$1",[order.orderId]);
  const before=await prisma.order.findUnique({where:{id:order.orderId}});
  const sql=await readFile("prisma/migrations/20260921080000_family_guardians/migration.sql","utf8");
  await db.query(sql.slice(sql.indexOf("INSERT INTO club_order_family")));
  expect(await prisma.order.findUnique({where:{id:order.orderId}})).toEqual(before);
  const co=await playwright.request.newContext({baseURL:origin});await signIn(co,second);
  expect((await co.get(`/orders/${order.orderId}`)).status()).toBe(200);
  expect((await request.delete("/api/family/guardians",post({kidIds:[id],email:second}))).status()).toBe(200);
  expect((await (await co.get("/api/family")).json()).kids).toEqual([]);
  expect((await db.query("SELECT snapshot->'registration'->'guardians' AS guardians FROM club_signed_waiver WHERE kid_id=$1",[id])).rows[0].guardians).toHaveLength(2);
  expect((await request.post("/api/family/guardians",post({kidIds:[id],guardian:details(),confirm:true}))).status()).toBe(201);
  expect((await (await co.get("/api/family")).json()).kids).toHaveLength(1);
  expect((await db.query("SELECT * FROM club_current_guardian WHERE kid_id=$1 AND email=$2",[id,second])).rowCount).toBe(1);
  await co.dispose();
});


test("guardian invitation link completes email-code sign-in to My family",async({page})=>{
  const id=(await (await admin.post("/api/kids",post({name:"Invited Duckie"}))).json()).kid.id;
  const response=await admin.post("/api/family/guardians",post({kidIds:[id],guardian:details(),confirm:true}));
  expect(response.status()).toBe(201);expect((await response.json()).notification).toBe("sent");
  const invitation=(await invitations(second)).at(-1)!;
  await page.goto(invitation.text.match(/https?:\/\/\S+/)![0]);
  await expect(page.locator('#login-intro')).toContainText("guardian invitation");
  await page.getByLabel("Your email address",{exact:true}).fill(second);
  await page.getByRole("button",{name:"Email me a code"}).click();
  await expect(page.getByLabel("Your six-digit code",{exact:true})).toBeVisible();
  await page.getByLabel("Your six-digit code",{exact:true}).fill(await codeFor(second));
  await page.getByRole("button",{name:/^Sign in/}).click();
  await expect(page).toHaveURL('/members/profile');
  await expect(page.getByRole('region',{name:'Family guardians'})).toContainText('Invited Duckie');
  expect((await (await page.request.get('/api/session')).json())).toMatchObject({family:true,member:false,admin:false});
});

test("failed invitations preserve access and show a retry control; invalid email never saves",async({page})=>{
  const id=await kid("Delivery Duckie");await signIn(page.request,parent);
  await page.goto('/members/profile');
  const area=page.getByRole('region',{name:'Family guardians'});
  await area.getByRole('button',{name:'Add a legal guardian',exact:true}).click();
  await area.getByLabel('Guardian name',{exact:true}).fill('Dora Test');
  await area.getByLabel('Guardian email',{exact:true}).fill('Hejj');
  await area.getByLabel('Phone',{exact:true}).fill('+230 5555 6789');
  await area.getByLabel('Relationship',{exact:true}).fill('Mother');
  await area.getByRole('checkbox',{name:/I confirm/}).check();
  await area.getByRole('button',{name:'Add guardian',exact:true}).click();
  expect(await area.getByLabel('Guardian email',{exact:true}).evaluate((input:HTMLInputElement)=>input.validity.typeMismatch)).toBe(true);
  expect((await page.request.post('/api/family/guardians',post({kidIds:[id],guardian:details('Hejj'),confirm:true}))).status()).toBe(400);
  await area.getByLabel('Guardian email',{exact:true}).fill('delivery-failure@example.com');
  await area.getByRole('button',{name:'Add guardian',exact:true}).click();
  await expect(area.getByRole('status')).toContainText('Guardian added, but the invitation email could not be sent. Their family access is saved.');
  expect((await db.query('SELECT 1 FROM club_current_guardian WHERE kid_id=$1 AND email=$2',[id,'delivery-failure@example.com'])).rowCount).toBe(1);
  await area.getByRole('button',{name:/Resend invitation to Dora Test/}).click();
  await expect(area.getByRole('status')).toHaveText('The invitation email could not be sent. Family access is still saved. Please try again later.');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await area.scrollIntoViewIfNeeded();await area.screenshot({path:'test-results/guardian-invitation-mobile.png'});
});

test("duplicate additions do not resend; retries require current permissions and are rate limited",async({request,playwright})=>{
  const id=await kid('Invitation Duckie');await signIn(request,parent);
  const before=(await invitations(second)).length;
  const body={kidIds:[id],guardian:details(),confirm:true};
  expect((await request.post('/api/family/guardians',post(body))).status()).toBe(201);
  expect((await (await request.post('/api/family/guardians',post(body))).json()).notification).toBe('not_needed');
  expect(await invitations(second)).toHaveLength(before+1);
  const stranger=await playwright.request.newContext({baseURL:origin});await signIn(stranger,'stranger@example.com');
  const resend={kidIds:[id],email:second};
  expect((await stranger.patch('/api/family/guardians',post(resend))).status()).toBe(404);
  expect((await guest.patch('/api/family/guardians',post(resend))).status()).toBe(401);
  expect((await request.patch('/api/family/guardians',{headers:{origin:'https://evil.example'},data:resend})).status()).toBe(403);
  expect((await request.patch('/api/family/guardians',post({...resend,email:'unlinked@example.com'}))).status()).toBe(404);
  expect(await invitations(second)).toHaveLength(before+1);
  for(let n=0;n<3;n++)expect((await (await request.patch('/api/family/guardians',post(resend))).json()).notification).toBe('sent');
  expect((await request.patch('/api/family/guardians',post(resend))).status()).toBe(429);
  await request.delete('/api/family/guardians',post(resend));
  expect((await admin.patch('/api/family/guardians',post(resend))).status()).toBe(404);
  expect(await invitations(second)).toHaveLength(before+4);
  await stranger.dispose();
});

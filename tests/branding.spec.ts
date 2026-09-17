import { test,expect } from "@playwright/test";
import pg from "pg";
import { signIn,codeFor } from "./auth-helpers";
import { starterRecipe } from "../src/lib/granola";
const db=new pg.Pool({connectionString:process.env.DUCKIES_DATABASE_URL});const origin="http://127.0.0.1:4329";const owner="andras@hejj.xyz";
test.beforeEach(async()=>{
 await db.query('TRUNCATE branding_access_event,branding_access,shop_request_limit,granola_ai_limit,granola_revision,granola_pack,club_member,"user","session",account,verification,"rateLimit" CASCADE');
 await db.query("INSERT INTO club_member(email,role) VALUES('organiser@example.com','organiser')");
});
test.afterAll(async()=>{await db.end();});
async function seed(email:string,status="pending",edit=false,verified=true){await db.query("INSERT INTO branding_access(email,name,reason,status,can_edit,verified_at) VALUES($1,'New collaborator','Happy to help',$2,$3,CASE WHEN $4 THEN now() ELSE NULL END)",[email,status,edit,verified]);}

test("anonymous HTML, direct APIs and worksheets expose only the teaser",async({request,page})=>{
 for(const url of ['/branding-plan','/product-ideas']){
  const r=await request.get(url);expect(r.status()).toBe(200);expect(r.headers()['cache-control']).toContain('no-store');expect(r.headers()['vercel-cdn-cache-control']).toBe('no-store');
  const html=await r.text();expect(html).toContain('Request access');expect(html).not.toContain('Granola recipe simulator');expect(html).not.toContain('granola-business-case');expect(html).not.toContain('Compare fairly');expect(html).not.toContain('Leading hypothesis');expect(html).not.toContain('GranolaSimulator');
 }
 for(const url of ['/api/granola','/api/%67ranola','/api/granola/basic/history','/api/granola/advice','/api/branding/approvals'])expect((await request.get(url)).status()).toBe(401);
 const template=await request.get('/templates/brand-concept.html',{maxRedirects:0});expect(template.status()).toBe(302);expect(template.headers().location).toBe('/branding-plan');
 await page.goto('/branding-plan');await expect(page.getByRole('button',{name:'Request access',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/branding-teaser-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/branding-teaser-mobile.png',fullPage:true});
});

test("a request needs verified email and cannot forge identity or overwrite a decision",async({request})=>{
 const data={email:'new@example.com',name:'New collaborator',reason:'Let’s build'};
 expect((await request.post('/api/branding/request',{headers:{origin:'https://elsewhere.example'},data})).status()).toBe(403);
 expect((await request.post('/api/branding/request',{headers:{origin},data:{...data,email:'bad'}})).status()).toBe(400);
 expect((await request.post('/api/branding/request',{headers:{origin},data})).status()).toBe(200);
 expect((await db.query("SELECT verified_at,status FROM branding_access WHERE email=$1",[data.email])).rows[0]).toEqual({verified_at:null,status:'pending'});
 await signIn(request,owner);
 expect((await (await request.get('/api/branding/approvals')).json()).requests).toEqual([]);
 expect((await request.post('/api/branding/approvals',{headers:{origin},data:{email:data.email,decision:'approved',canEdit:true,version:1}})).status()).toBe(409);
 expect((await request.post('/api/branding/request',{headers:{origin},data})).status()).toBe(403);
 await request.post('/api/auth/sign-out',{headers:{origin},data:{}});await signIn(request,data.email);
 expect((await request.get('/api/granola')).status()).toBe(403);
 expect((await request.post('/api/branding/request',{headers:{origin},data})).status()).toBe(200);
 expect((await db.query("SELECT verified_at FROM branding_access WHERE email=$1",[data.email])).rows[0].verified_at).not.toBeNull();
 expect((await request.get('/api/kids')).status()).toBe(401);expect((await request.get('/api/admin/products')).status()).toBe(403);
 await db.query("UPDATE branding_access SET status='revoked' WHERE email=$1",[data.email]);
 await request.post('/api/auth/sign-out',{headers:{origin},data:{}});
 await request.post('/api/branding/request',{headers:{origin},data:{...data,name:'Attacker',reason:'Overwrite'}});
 expect((await db.query("SELECT status,name,reason FROM branding_access WHERE email=$1",[data.email])).rows[0]).toEqual({status:'revoked',name:data.name,reason:data.reason});
});

test("owner manages independent branding permissions with immediate revocation and stale-decision protection",async({request,browser})=>{
 await seed('viewer@example.com');await signIn(request,owner);
 expect((await (await request.get('/api/granola')).json()).canEdit).toBe(true);
 const data={email:'viewer@example.com',decision:'approved',canEdit:false,version:1};
 expect((await request.post('/api/branding/approvals',{data})).status()).toBe(403);
 expect((await request.post('/api/branding/approvals',{headers:{origin},data})).status()).toBe(200);
 expect((await request.post('/api/branding/approvals',{headers:{origin},data})).status()).toBe(409);
 const context=await browser.newContext();await signIn(context.request,'viewer@example.com');
 expect((await (await context.request.get('/api/granola')).json()).canEdit).toBe(false);
 expect((await context.request.get('/branding-plan')).status()).toBe(200);expect(await (await context.request.get('/branding-plan')).text()).toContain('href="/branding-plan/business-case"');
 expect(await (await context.request.get('/branding-plan/business-case')).text()).toContain('Granola recipe simulator');
 expect((await context.request.get('/templates/brand-concept.html')).status()).toBe(200);
 expect((await context.request.put('/api/granola/basic',{headers:{origin},data:{recipe:starterRecipe('basic'),version:0}})).status()).toBe(403);
 expect((await context.request.get('/api/branding/approvals')).status()).toBe(403);
 await request.post('/api/branding/approvals',{headers:{origin},data:{...data,version:2,canEdit:true}});
 expect((await context.request.put('/api/granola/basic',{headers:{origin},data:{recipe:starterRecipe('basic'),version:0}})).status()).toBe(200);
 await request.post('/api/branding/approvals',{headers:{origin},data:{...data,version:3,decision:'revoked'}});
 expect((await context.request.get('/api/granola')).status()).toBe(403);
 expect((await context.request.get('/api/granola/basic/history')).status()).toBe(403);
 expect((await context.request.post('/api/granola/advice',{headers:{origin},data:{}})).status()).toBe(403);
 expect(await (await context.request.get('/branding-plan')).text()).not.toContain('Granola recipe simulator');
 expect((await context.request.get('/branding-plan/business-case',{maxRedirects:0})).status()).toBe(302);
 expect((await context.request.get('/templates/brand-concept.html',{maxRedirects:0})).status()).toBe(302);
 expect((await db.query('SELECT status FROM branding_access_event ORDER BY id')).rows.map(r=>r.status)).toEqual(['approved','approved','revoked']);
 expect((await request.post('/api/branding/approvals',{headers:{origin},data:{...data,email:owner,decision:'revoked'}})).status()).toBe(403);
 await context.close();
});

test("club organisers and unverified approvals do not inherit branding access",async({request})=>{
 await signIn(request,'organiser@example.com');
 expect((await request.get('/api/granola')).status()).toBe(403);expect((await request.get('/api/branding/approvals')).status()).toBe(403);
 expect((await request.get('/branding-plan/access',{maxRedirects:0})).headers().location).toBe('/branding-plan');
 await seed('organiser@example.com','approved',true,false);expect((await request.get('/api/granola')).status()).toBe(403);
});

test("request, verify, approve and sign out work in the UI",async({page,browser})=>{
 await page.goto('/branding-plan');await page.getByLabel('Your name').fill('Brand Partner');await page.getByLabel('Email address',{exact:true}).fill('partner@example.com');await page.getByLabel('How would you like to contribute?').fill('Kitchen trials and packaging');await page.getByRole('button',{name:'Request access',exact:true}).click();
 await expect(page.getByLabel('Six-digit code')).toBeVisible();await page.getByLabel('Six-digit code').fill(await codeFor('partner@example.com'));await page.getByRole('button',{name:'Verify & request access'}).click();await expect(page.getByRole('heading',{name:'Your request is with Andras.'})).toBeVisible();
 const admin=await browser.newContext();await signIn(admin.request,owner);const ap=await admin.newPage();await ap.goto('/branding-plan/access');
 const row=ap.getByRole('article').filter({hasText:'partner@example.com'});await expect(row).toContainText('Kitchen trials and packaging');await row.getByLabel('Allow recipe saving & AI').check();await ap.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));await ap.screenshot({path:'test-results/branding-approvals-desktop.png',fullPage:true});await ap.setViewportSize({width:390,height:844});expect(await ap.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await ap.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));await ap.screenshot({path:'test-results/branding-approvals-mobile.png',fullPage:true});
 await row.getByRole('button',{name:'Approve access'}).click();await expect(row.locator('.b-badge')).toHaveText('approved');
 await page.getByRole('link',{name:'Check access',exact:true}).click();await expect(page.getByRole('heading',{name:'Project Molt'})).toBeVisible();
 await page.getByRole('link',{name:'Recipe & business case →'}).click();await page.getByLabel('Granola recipe simulator').scrollIntoViewIfNeeded();await expect(page.getByLabel('Granola recipe simulator')).toBeVisible();await expect(page.getByRole('button',{name:'Save version'})).toBeEnabled();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Request access',exact:true})).toBeVisible();
 await row.getByRole('button',{name:'Revoke access'}).click();await expect(row.locator('.b-badge')).toHaveText('revoked');await admin.close();
});

test("request input is bounded and repeat submissions are rate limited",async({request})=>{
 expect((await request.post('/api/branding/request',{headers:{origin,'content-type':'application/json'},data:'x'.repeat(9000)})).status()).toBe(413);
 for(let i=0;i<12;i++)expect((await request.post('/api/branding/request',{headers:{origin},data:{email:'repeat@example.com',name:'Repeat',reason:''}})).status()).toBe(200);
 expect((await request.post('/api/branding/request',{headers:{origin},data:{email:'repeat@example.com',name:'Repeat',reason:''}})).status()).toBe(429);
 expect((await db.query('SELECT count(*)::int n FROM branding_access')).rows[0].n).toBe(1);
});

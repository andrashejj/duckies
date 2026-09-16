import { test, expect } from "@playwright/test";
import { calculate, starterRecipe, recipeSchema } from "../src/lib/granola";
import pg from "pg";
import { signIn } from "./auth-helpers";
import { calculateNutrition } from "../src/lib/granola-nutrition";
import { ingredientNutrition, emptyNutrients, nutritionProfiles, profileNutrition } from "../src/lib/granola-nutrition-data";
import { applySuggestion } from "../src/lib/granola-advice";
import { generateAdvice } from "../src/lib/server/granola-ai";
const db=new pg.Pool({connectionString:process.env.DUCKIES_DATABASE_URL});
const origin="http://127.0.0.1:4329";

test.beforeEach(async()=>{
  await db.query('TRUNCATE branding_access_event, branding_access, granola_ai_limit, granola_revision, granola_pack, club_member, "user", "session", account, verification, "rateLimit" CASCADE');
  await db.query("INSERT INTO club_member(email,role) VALUES ('organiser@example.com','organiser'),('parent@example.com','member')");
  await db.query("INSERT INTO branding_access(email,name,status,can_edit,verified_at) VALUES ('organiser@example.com','Editor','approved',true,now()),('parent@example.com','Reader','approved',false,now())");
});
test.afterAll(async()=>{await db.end();});

test("recipe mass, yield and operating costs reconcile",()=>{
  const r=starterRecipe("basic"), c=calculate(r);
  expect(c.rows.reduce((s,i)=>s+i.input,0)).toBeCloseTo(320,8);
  expect(c.ingredients).toBeCloseTo(142.148260869565,8);
  expect(c.production).toBeCloseTo(c.ingredients*1.05+85,8);
  expect(c.monthlyProfit).toBeCloseTo(35000-100*c.production-700-3000,8);
  const doubled=calculate({...r,packGrams:600});expect(doubled.ingredients).toBeCloseTo(c.ingredients*2,8);
  const wetter=calculate({...r,yieldPercent:75});expect(wetter.rows.reduce((s,i)=>s+i.input,0)).toBeCloseTo(400,8);
  const loss=calculate({...r,sellThroughPercent:90});
  expect(loss.sold).toBe(90);expect(loss.monthlyProfit).toBeCloseTo(90*350*.98-100*c.production-3000,8);
  const batch=calculate({...r,batchPacks:10});expect(batch.labour).toBe(100);expect(batch.otherPerPack).toBe(50);
});

test("invalid recipes and unprofitable cases have explicit boundaries",()=>{
  const r=starterRecipe("basic");
  for(const patch of [{batchPacks:0},{yieldPercent:0},{packGrams:0},{monthlyPacks:1.5},{feePercent:60,retailerPercent:50},{ingredients:[]},{ingredients:[{...r.ingredients[0],packSize:0}]},{ingredients:r.ingredients.map(i=>({...i,grams:0}))}]) expect(recipeSchema.safeParse({...r,...patch}).success).toBe(false);
  const none=calculate({...r,price:0,sellThroughPercent:0});expect(none.margin).toBeNull();expect(none.breakEvenProduced).toBeNull();expect(Number.isFinite(none.monthlyProfit)).toBe(true);
  expect(calculate({...r,retailerPercent:70,feePercent:2}).targetPrice).toBeNull();
});

test("approved reads do not seed the DB; writes require edit access and origin",async({request})=>{
  expect((await request.get('/api/granola')).status()).toBe(401);
  expect((await request.put('/api/granola/basic',{headers:{origin},data:{recipe:starterRecipe('basic'),version:0}})).status()).toBe(401);
  await signIn(request,'parent@example.com');
  const response=await request.get('/api/granola');expect(response.status()).toBe(200);expect(response.headers()['cache-control']).toContain('no-store');
  const data=await response.json();expect(data.packs.map((p:any)=>p.id)).toEqual(['basic','sports','champ']);expect(data.canEdit).toBe(false);
  expect((await db.query('SELECT count(*)::int count FROM granola_pack')).rows[0].count).toBe(0);
  const body={recipe:starterRecipe('basic'),version:0};
  expect((await request.put('/api/granola/basic',{headers:{origin},data:body})).status()).toBe(403);
  await signIn(request,'organiser@example.com');
  expect((await request.put('/api/granola/basic',{headers:{origin:'https://untrusted.example'},data:body})).status()).toBe(403);
  expect((await request.put('/api/granola/basic',{data:body})).status()).toBe(403);
  expect((await request.put('/api/granola/basic',{headers:{origin},data:{...body,recipe:{...body.recipe,yieldPercent:0}}})).status()).toBe(400);
  expect((await request.put('/api/granola/unknown',{headers:{origin},data:body})).status()).toBe(404);
  expect((await request.put('/api/granola/basic',{headers:{origin,'content-type':'application/json'},data:'x'.repeat(65000)})).status()).toBe(413);
});

test("saves survive fresh reads and preserve immutable version history",async({request})=>{
  await signIn(request,'organiser@example.com');
  const recipe=starterRecipe('sports');recipe.note='Kitchen test: more seeds';recipe.costs.push({id:'delivery',name:'Delivery',amount:12,basis:'pack'});
  const first=await request.put('/api/granola/sports',{headers:{origin},data:{recipe,version:0}});expect(first.status()).toBe(200);expect((await first.json()).pack.version).toBe(1);
  const next={...recipe,price:420};
  expect((await request.put('/api/granola/sports',{headers:{origin},data:{recipe:next,version:1}})).status()).toBe(200);
  const current=(await (await request.get('/api/granola')).json()).packs.find((p:any)=>p.id==='sports');expect(current.recipe).toEqual(next);expect(current.version).toBe(2);
  const history=(await (await request.get('/api/granola/sports/history')).json()).revisions;expect(history.map((r:any)=>r.version)).toEqual([2,1]);expect(history[1].recipe).toEqual(recipe);
  expect((await db.query("SELECT recipe->>'price' price FROM granola_pack WHERE id='sports'")).rows[0].price).toBe('420');
});

test("concurrent saves accept one version and reject stale edits",async({request})=>{
  await signIn(request,'organiser@example.com');
  const responses=await Promise.all([380,390].map(price=>request.put('/api/granola/champ',{headers:{origin},data:{recipe:{...starterRecipe('champ'),price},version:0}})));
  expect(responses.map(r=>r.status()).sort()).toEqual([200,409]);
  expect((await db.query("SELECT count(*)::int count FROM granola_revision WHERE pack_id='champ'")).rows[0].count).toBe(1);
});

test("recipe editor saves added and removed rows, survives reload and restores a version",async({page})=>{
  await signIn(page.request,'organiser@example.com');
  await page.goto('/branding-plan#granola-business-case');
  const app=page.getByLabel('Granola recipe simulator');
  await expect(app.getByRole('button',{name:'Save version'})).toBeEnabled();
  await app.getByRole('button',{name:'Add ingredient',exact:false}).click();
  await app.getByLabel('Ingredient 7 name',{exact:true}).fill('Coconut');
  await app.getByLabel('Coconut shelf price',{exact:true}).fill('90');
  await app.getByRole('button',{name:'Remove Raisins',exact:true}).click();
  await app.getByRole('button',{name:'Add cost',exact:false}).click();
  await app.getByLabel('Cost 6 name',{exact:true}).fill('Transport extra');
  await app.getByLabel('Transport extra amount',{exact:true}).fill('100');
  await app.getByLabel('Transport extra basis',{exact:true}).selectOption('month');
  await app.getByRole('button',{name:'Save version'}).click();await expect(app.getByRole('status')).toContainText('version 1');
  await page.reload();await expect(app.getByLabel('Coconut shelf price',{exact:true})).toHaveValue('90');expect(await app.getByLabel('Remove Raisins',{exact:true}).count()).toBe(0);
  await expect(app.getByLabel('Transport extra basis',{exact:true})).toHaveValue('month');
  await app.getByLabel('Selling price',{exact:true}).fill('410');await app.getByRole('button',{name:'Save version'}).click();await expect(app.getByRole('status')).toContainText('version 2');
  await app.getByRole('button',{name:'Versions',exact:true}).click();await app.getByRole('button',{name:/v1 · Basic/}).click();
  await expect(app.getByLabel('Selling price',{exact:true})).toHaveValue('350');await app.getByRole('button',{name:'Save version'}).click();await expect(app.getByRole('status')).toContainText('version 3');
});

test("mobile preview recalculates and keeps unsaved mixes while switching packs",async({page})=>{
  await signIn(page.request,'parent@example.com');
  await page.setViewportSize({width:390,height:844});await page.goto('/branding-plan#granola-business-case');
  const app=page.getByLabel('Granola recipe simulator');await expect(app).toHaveAttribute('aria-busy','false');
  await app.getByLabel('Selling price',{exact:true}).fill('500');
  await expect(app.locator('.g-profit strong')).toContainText('Rs 255.');
  await app.getByRole('button',{name:/Sports After the session/}).click();await expect(app.getByLabel('Pack name',{exact:true})).toHaveValue('Sports');
  await app.getByRole('button',{name:/Basic The everyday mix/}).click();await expect(app.getByLabel('Selling price',{exact:true})).toHaveValue('500');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(app.getByRole('button',{name:'Save version'})).toBeDisabled();
});

test("save failures and stale versions leave the edited recipe intact",async({page})=>{
  await signIn(page.request,'organiser@example.com');await page.goto('/branding-plan#granola-business-case');
  const app=page.getByLabel('Granola recipe simulator');await expect(app.getByRole('button',{name:'Save version'})).toBeEnabled();
  await app.getByLabel('Selling price',{exact:true}).fill('440');
  await page.route('**/api/granola/basic',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Saved recipes are temporarily unavailable.'})}));
  await app.getByRole('button',{name:'Save version'}).click();await expect(app.getByRole('alert')).toContainText('temporarily unavailable');await expect(app.getByLabel('Selling price',{exact:true})).toHaveValue('440');
  await page.unroute('**/api/granola/basic');
  expect((await page.request.put('/api/granola/basic',{headers:{origin},data:{recipe:starterRecipe('basic'),version:0}})).status()).toBe(200);
  await app.getByRole('button',{name:'Save version'}).click();await expect(app.getByRole('alert')).toContainText('another window');await expect(app.getByLabel('Selling price',{exact:true})).toHaveValue('440');
});

test("custom granola types persist alongside starters with independent histories",async({request})=>{
  await signIn(request,'organiser@example.com');
  const id=`mix-${crypto.randomUUID()}`;
  const recipe={...starterRecipe('basic'),name:'Coconut coffee'};
  expect((await request.put(`/api/granola/${id}`,{headers:{origin},data:{recipe,version:0}})).status()).toBe(200);
  const renamed={...recipe,name:'Coffee crunch',price:480};
  expect((await request.put(`/api/granola/${id}`,{headers:{origin},data:{recipe:renamed,version:1}})).status()).toBe(200);
  const packs=(await (await request.get('/api/granola')).json()).packs;
  expect(packs).toHaveLength(4);expect(packs.slice(0,3).map((p:any)=>p.id)).toEqual(['basic','sports','champ']);
  expect(packs[3]).toMatchObject({id,version:2,recipe:renamed});
  const revisions=(await (await request.get(`/api/granola/${id}/history`)).json()).revisions;
  expect(revisions.map((r:any)=>r.recipe.name)).toEqual(['Coffee crunch','Coconut coffee']);
});

test("new and duplicated granola types can be edited, saved and compared after reload",async({page})=>{
  await signIn(page.request,'organiser@example.com');await page.goto('/branding-plan#granola-business-case');
  const app=page.getByLabel('Granola recipe simulator');await expect(app).toHaveAttribute('aria-busy','false');
  await app.getByRole('button',{name:'New granola',exact:false}).click();
  await app.getByLabel('Pack name',{exact:true}).fill('Coconut coffee');
  await app.getByLabel('Ingredient 1 name',{exact:true}).fill('Coconut oats');
  await app.getByLabel('Coconut oats shelf price',{exact:true}).fill('120');
  await app.getByRole('button',{name:'Save version'}).click();await expect(app.getByRole('status')).toContainText('version 1');
  await app.getByRole('button',{name:'Duplicate this recipe',exact:true}).click();
  await expect(app.getByLabel('Pack name',{exact:true})).toHaveValue('Coconut coffee (copy)');
  await expect(app.getByLabel('Coconut oats shelf price',{exact:true})).toHaveValue('120');
  await app.getByLabel('Pack name',{exact:true}).fill('Coffee deluxe');
  await app.getByLabel('Coconut oats shelf price',{exact:true}).fill('180');
  await app.getByRole('button',{name:'Save version'}).click();await expect(app.getByRole('status')).toContainText('version 1');
  await page.reload();await expect(app).toHaveAttribute('aria-busy','false');
  await expect(app.locator('.g-pack-choice')).toHaveCount(5);
  await app.locator('.g-pack-choice').filter({hasText:'Coconut coffee'}).click();await expect(app.getByLabel('Coconut oats shelf price',{exact:true})).toHaveValue('120');
  await app.locator('.g-pack-choice').filter({hasText:'Coffee deluxe'}).click();await expect(app.getByLabel('Coconut oats shelf price',{exact:true})).toHaveValue('180');
  await expect(app.getByRole('columnheader',{name:'Coffee deluxe',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("nutrition scales by mass and yield, and unknown data never becomes zero",()=>{
  const base=starterRecipe('basic');
  const r={...base,ingredients:[base.ingredients[0]],packGrams:300,yieldPercent:100};
  const n=calculateNutrition(r);
  expect(n.values.energy.value).toBeCloseTo(379/2,8);
  expect(n.values.protein.value).toBeCloseTo(13.15/2,8);
  expect(n.complete).toBe(true);
  expect(calculateNutrition({...r,packGrams:600}).values.protein.value).toBeCloseTo(n.values.protein.value!,8);
  expect(calculateNutrition({...r,yieldPercent:80}).values.protein.value).toBeCloseTo(n.values.protein.value!/0.8,8);
  expect(calculateNutrition({...r,wastePercent:70}).values.protein.value).toBe(n.values.protein.value);
  expect(calculateNutrition({...r,servingGrams:100}).values.protein.value).toBeCloseTo(13.15,8);
  expect(calculateNutrition(base).missing).toContain('Cinnamon + salt');
  const unknown={...r,ingredients:[{...r.ingredients[0],nutrition:null}]};
  expect(calculateNutrition(unknown).values.energy.value).toBeNull();
  const chia={...r,ingredients:[{...r.ingredients[0],name:'Chia seeds'}]};
  expect(calculateNutrition(chia).values.sugars.value).toBeNull();
  expect(calculateNutrition(chia).values.protein.complete).toBe(true);
  expect(ingredientNutrition({...r.ingredients[0],name:'Mystery blend'})).toBeNull();
  expect(recipeSchema.safeParse({...r,ingredients:[{...r.ingredients[0],nutrition:{source:'Label',values:{...emptyNutrients,fat:2,saturatedFat:5}}}]}).success).toBe(false);
});

test("nutrition references and serving size survive saves and version restoration",async({request})=>{
  await signIn(request,'organiser@example.com');
  const recipe=starterRecipe('basic');recipe.servingGrams=60;
  recipe.ingredients[0].nutrition={source:'Bokomo label checked in kitchen',values:{...profileNutrition(nutritionProfiles.find(p=>p.id==='08120')!).values,protein:12}};
  expect((await request.put('/api/granola/basic',{headers:{origin},data:{recipe,version:0}})).status()).toBe(200);
  const current=(await (await request.get('/api/granola')).json()).packs[0].recipe;
  expect(current.servingGrams).toBe(60);expect(current.ingredients[0].nutrition).toEqual(recipe.ingredients[0].nutrition);
  const history=(await (await request.get('/api/granola/basic/history')).json()).revisions;
  expect(history[0].recipe).toEqual(recipe);
});

test("AI endpoint enforces access and origin, validates changes and recalculates costs",async({request})=>{
  const recipe=starterRecipe('basic');const body={recipe,goal:'less-sugar',brief:''};
  expect((await request.post('/api/granola/advice',{headers:{origin},data:body})).status()).toBe(401);
  await signIn(request,'parent@example.com');
  expect((await request.post('/api/granola/advice',{headers:{origin},data:body})).status()).toBe(403);
  await signIn(request,'organiser@example.com');
  expect((await request.post('/api/granola/advice',{headers:{origin:'https://untrusted.example'},data:body})).status()).toBe(403);
  expect((await request.post('/api/granola/advice',{headers:{origin},data:{...body,goal:'unknown'}})).status()).toBe(400);
  const response=await request.post('/api/granola/advice',{headers:{origin},data:body});expect(response.status()).toBe(200);
  const {advice}=await response.json();
  const next=applySuggestion(recipe,advice.suggestions[0]);
  expect(advice.suggestions[0].after.ingredients).toBeCloseTo(calculate(next).ingredients,8);
  expect(advice.suggestions[0].after.nutrition.values.sugars.value).toBeLessThan(advice.before.nutrition.values.sugars.value);
  expect((await db.query('SELECT count(*)::int count FROM granola_pack')).rows[0].count).toBe(0);
});

test("invalid AI responses and provider failure preserve recipes and hide provider details",async({request})=>{
  await signIn(request,'organiser@example.com');
  for(const brief of ['fixture-invalid-id','fixture-empty-mix','fixture-incomplete','fixture-refusal','fixture-malformed','fixture-provider-failure']) {
    await db.query('TRUNCATE granola_ai_limit');
    const response=await request.post('/api/granola/advice',{headers:{origin},data:{recipe:starterRecipe('basic'),goal:'balanced',brief}});
    expect(response.status(),brief).toBe(502);expect(await response.text()).not.toContain('secret provider details');
  }
  expect((await db.query('SELECT count(*)::int count FROM granola_revision')).rows[0].count).toBe(0);
});

test("AI limits concurrent requests and missing configuration fails explicitly",async({request})=>{
  const prior=process.env.OPENAI_API_KEY;
  try{delete process.env.OPENAI_API_KEY;await expect(generateAdvice(starterRecipe('basic'),'balanced','','test')).rejects.toThrow('not connected');}
  finally{if(prior!==undefined)process.env.OPENAI_API_KEY=prior;}
  await signIn(request,'organiser@example.com');
  const responses=await Promise.all(Array.from({length:6},()=>request.post('/api/granola/advice',{headers:{origin},data:{recipe:starterRecipe('basic'),goal:'balanced',brief:''}})));
  expect(responses.map(r=>r.status()).sort()).toEqual([200,200,200,200,200,429]);
  expect((await db.query("SELECT count FROM granola_ai_limit WHERE key LIKE '%:day'")).rows[0].count).toBe(5);
});

test("nutrition UI edits references; AI previews apply, undo and reject stale reviews",async({page})=>{
  await signIn(page.request,'organiser@example.com');await page.goto('/branding-plan#granola-business-case');
  const app=page.getByLabel('Granola recipe simulator');await expect(app).toHaveAttribute('aria-busy','false');
  const oats=app.locator('.g-ingredient').first();await oats.locator('summary').click();
  await oats.getByLabel('Oats Protein per 100 g',{exact:true}).fill('12');
  await expect(oats.getByLabel('Oats nutrition source',{exact:true})).toHaveValue(/Edited from USDA/);
  await app.getByLabel('Nutrition serving size',{exact:true}).fill('60');
  await app.getByRole('button',{name:'Save version'}).click();await expect(app.getByRole('status')).toContainText('version 1');
  await page.reload();await expect(app.getByLabel('Nutrition serving size',{exact:true})).toHaveValue('60');
  const ask=app.getByRole('button',{name:'Suggest recipe experiments'});await expect(ask).toBeEnabled();await ask.click();
  const review=app.getByLabel('AI recipe suggestions',{exact:true});await expect(review).toBeVisible();
  await review.getByRole('button',{name:'Try this in the editor'}).click();await expect(app.getByLabel('Honey amount in mix',{exact:true})).toHaveValue('30');
  await expect(review.getByRole('button',{name:'Try this in the editor'})).toBeDisabled();
  await review.getByRole('button',{name:'Undo experiment'}).click();await expect(app.getByLabel('Honey amount in mix',{exact:true})).toHaveValue('45');
  await app.getByLabel('Selling price',{exact:true}).fill('450');await expect(review.getByRole('button',{name:'Try this in the editor'})).toBeDisabled();
  await expect(review).toContainText('recipe has changed');
  await page.setViewportSize({width:390,height:844});await app.getByLabel('Nutrition and AI adviser',{exact:true}).scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("scenario changes update the whole draft immediately on desktop and mobile",async({page})=>{
  await signIn(page.request,'parent@example.com');
  await page.goto('/branding-plan#granola-business-case');
  const app=page.getByLabel('Granola recipe simulator');await expect(app).toHaveAttribute('aria-busy','false');
  const explorer=app.getByLabel('Business scenario explorer',{exact:true});
  await expect(explorer.getByLabel('Scenario packs per month',{exact:true})).toHaveValue('100');
  await explorer.getByRole('button',{name:'10 packs',exact:true}).click();
  await expect(app.getByLabel('Packs produced monthly',{exact:true})).toHaveValue('10');
  await expect(app.locator('.g-month > strong')).toHaveText('Rs -2,563');
  await expect(explorer.locator('.g-scenario-result')).toContainText('Rs -2,563');
  await expect(explorer.locator('.g-scenario-threshold')).toContainText('33 packs');
  await explorer.getByRole('button',{name:'Selling price',exact:true}).click();
  await explorer.getByRole('button',{name:'Rs 200',exact:true}).click();
  await expect(app.getByLabel('Selling price',{exact:true})).toHaveValue('200');
  await expect(app.locator('.g-month > strong')).toHaveText('Rs -4,033');
  await explorer.getByRole('button',{name:'Hourly labour',exact:true}).click();
  await explorer.getByLabel('Scenario hourly labour cost',{exact:true}).fill('300');
  await expect(app.getByLabel('Loaded hourly cost',{exact:true})).toHaveValue('300');
  await expect(app.locator('.g-month > strong')).toHaveText('Rs -5,533');
  const sheet=app.getByLabel('Business case sheet',{exact:true});
  await expect(sheet.locator('.g-sheet-cost').filter({has:page.getByLabel('Order handling + admin amount',{exact:true})}).locator('.g-sheet-amount')).toContainText('Rs 3,000.00');
  await expect(sheet.locator('.g-sheet-result > strong')).toHaveText('Rs -5,533');
  await app.getByLabel('Batch costing',{exact:true}).selectOption('proportional');
  await expect(app.locator('.g-month > strong')).toHaveText('Rs -4,633');
  await explorer.getByRole('button',{name:'Packs per month',exact:true}).click();
  await explorer.getByRole('button',{name:'0 packs',exact:true}).click();
  await expect(app.locator('.g-month > strong')).toHaveText('Rs -4,000');
  await page.setViewportSize({width:390,height:844});
  await explorer.screenshot({path:'test-results/granola-dynamic-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("monthly ledger reconciles sourcing, batch costs, paid admin and sold-only costs",()=>{
  const recipe=starterRecipe('basic');
  recipe.monthlyPacks=33;recipe.sellThroughPercent=80;recipe.hourlyCost=300;
  recipe.ingredients[0]={...recipe.ingredients[0],discountPercent:20,sourcingCost:10};
  recipe.costs.push({id:'dispatch',name:'Dispatch',amount:0.1,calculation:'labour',basis:'sold'});
  const c=calculate(recipe);
  expect(c.rows[0].landedPrice).toBeCloseTo(75.6,8);
  expect(c.rows[0].cost).toBeCloseTo(180/500*75.6,8);
  expect(c.sold).toBe(26);expect(c.unsold).toBe(7);expect(c.batches).toBe(2);
  expect(c.productionHours).toBe(10);expect(c.totalPaidHours).toBe(22.6);
  expect(c.overhead).toBe(4000);
  const expectedCosts=33*c.ingredients*1.05+10*300+33*20+2*(160+140)+10*300+1000+26*30+26*350*.02;
  expect(c.monthlyCost).toBeCloseTo(expectedCosts,8);
  expect(c.monthlyProfit).toBeCloseTo(26*350-expectedCosts,8);
  expect(c.monthlyIngredients+c.monthlyWaste+c.monthlyLabour+c.monthlyFees+c.monthlyRows.reduce((sum,row)=>sum+row.monthly,0)).toBeCloseTo(c.monthlyCost,8);
  expect(calculate({...recipe,price:c.breakEvenPrice!}).monthlyProfit).toBeCloseTo(0,7);
  expect(calculate({...recipe,monthlyPacks:0}).monthlyCost).toBe(4000);
  expect(calculate({...recipe,hourlyCost:0}).totalPaidHours).toBe(22.6);
});

test("break-even is the first non-negative whole-pack result, including rounded sell-through and batch jumps",()=>{
  for(const batchCostMode of ['whole','proportional'] as const) for(const sellThroughPercent of [100,90,73,51]) {
    const recipe={...starterRecipe('basic'),batchCostMode,sellThroughPercent,price:650};
    const c=calculate(recipe);expect(c.breakEvenProduced).not.toBeNull();
    expect(calculate({...recipe,monthlyPacks:c.breakEvenProduced!}).monthlyProfit).toBeGreaterThanOrEqual(0);
    for(let monthlyPacks=0;monthlyPacks<c.breakEvenProduced!;monthlyPacks++) expect(calculate({...recipe,monthlyPacks},{includeBreakEven:false}).monthlyProfit).toBeLessThan(0);
  }
  const recipe=starterRecipe('basic');
  expect(calculate({...recipe,monthlyPacks:41}).monthlyProfit).toBeLessThan(calculate({...recipe,monthlyPacks:40}).monthlyProfit);
  expect(calculate({...recipe,sellThroughPercent:0}).breakEvenPrice).toBeNull();
  expect(calculate({...recipe,feePercent:100}).breakEvenPrice).toBeNull();
  expect(calculate({...recipe,costs:[],hourlyCost:0}).breakEvenProduced).toBe(0);
  const old={...recipe,batchCostMode:undefined,costs:recipe.costs.map(c=>c.id==='admin'?{...c,amount:2000,calculation:undefined}:c)};
  expect(recipeSchema.safeParse(old).success).toBe(true);
  expect(calculate({...old,monthlyPacks:10}).productionHours).toBe(2.5);
  expect(calculate({...old,hourlyCost:500}).overhead).toBe(3000);
  for(const patch of [{batchCostMode:'invalid'},{ingredients:[{...recipe.ingredients[0],discountPercent:101}]},{ingredients:[{...recipe.ingredients[0],sourcingCost:-1}]},{costs:[{...recipe.costs[0],calculation:'invalid'}]}]) expect(recipeSchema.safeParse({...recipe,...patch}).success).toBe(false);
});

test("sourcing and monthly assumptions change every result and survive save and reload",async({page})=>{
  await signIn(page.request,'organiser@example.com');await page.goto('/branding-plan#granola-business-case');
  const app=page.getByLabel('Granola recipe simulator');await expect(app).toHaveAttribute('aria-busy','false');
  await app.getByLabel('Oats supplier discount',{exact:true}).fill('20');
  await app.getByLabel('Oats sourcing cost',{exact:true}).fill('10');
  await app.getByLabel('Oats source',{exact:true}).fill('Supplier quote for delivered oats');
  await app.getByLabel('Loaded hourly cost',{exact:true}).fill('300');
  await app.getByLabel('Order handling + admin basis',{exact:true}).selectOption('sold');
  await app.getByLabel('Order handling + admin amount',{exact:true}).fill('0.1');
  const recipe=starterRecipe('basic');recipe.hourlyCost=300;
  recipe.ingredients[0]={...recipe.ingredients[0],discountPercent:20,sourcingCost:10,source:'Supplier quote for delivered oats'};
  recipe.costs[3]={...recipe.costs[3],basis:'sold',amount:0.1};
  const expected=`Rs ${calculate(recipe).monthlyProfit.toLocaleString('en-GB',{maximumFractionDigits:0})}`;
  await expect(app.locator('.g-month > strong')).toHaveText(expected);
  await expect(app.locator('.g-scenario-result > strong')).toContainText(expected);
  await expect(app.getByRole('row').filter({has:page.getByRole('rowheader',{name:'Monthly result',exact:true})})).toContainText(expected);
  await app.getByRole('button',{name:'Save version'}).click();await expect(app.getByRole('status')).toContainText('version 1');
  await page.reload();await expect(app).toHaveAttribute('aria-busy','false');
  await expect(app.getByLabel('Oats supplier discount',{exact:true})).toHaveValue('20');
  await expect(app.getByLabel('Oats sourcing cost',{exact:true})).toHaveValue('10');
  await expect(app.getByLabel('Order handling + admin basis',{exact:true})).toHaveValue('sold');
  await expect(app.getByLabel('Order handling + admin calculation',{exact:true})).toHaveValue('labour');
  await expect(app.locator('.g-month > strong')).toHaveText(expected);
  await page.setViewportSize({width:1440,height:1000});
  await app.locator('.g-results').screenshot({path:'test-results/granola-dynamic-desktop.png'});
});


test("price, supplier size, recipe proportions, overhead and fees have the expected financial effects",()=>{
  const recipe=starterRecipe('basic'),base=calculate(recipe);
  expect(calculate({...recipe,price:400}).monthlyProfit-base.monthlyProfit).toBeCloseTo(100*50*.98,8);
  expect(calculate({...recipe,hourlyCost:300}).monthlyProfit-base.monthlyProfit).toBeCloseTo(-35*100,8);
  const bulk={...recipe,ingredients:recipe.ingredients.map(i=>i.id==='oats'?{...i,packSize:1000}:i)};
  expect(calculate(bulk).monthlyProfit-base.monthlyProfit).toBeCloseTo(base.rows[0].cost/2*1.05*100,8);
  const changedMix={...recipe,ingredients:recipe.ingredients.map(i=>i.id==='almonds'?{...i,grams:60}:i)};
  const inputCost=changedMix.ingredients.reduce((sum,i)=>sum+i.grams/i.packSize*i.packPrice,0);
  const expectedPerPack=inputCost*300/(350*.9375);
  expect(calculate(changedMix).ingredients).toBeCloseTo(expectedPerPack,8);
  const rent={...recipe,costs:[...recipe.costs,{id:'rent',name:'Rent',amount:1500,basis:'month' as const}]};
  expect(calculate(rent).monthlyProfit-base.monthlyProfit).toBeCloseTo(-1500,8);
  expect(calculate({...recipe,feePercent:3,retailerPercent:10}).monthlyProfit-base.monthlyProfit).toBeCloseTo(-35000*.11,8);
});

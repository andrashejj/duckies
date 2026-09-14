import { z } from "zod";
import { nutritionSchema } from "./granola-nutrition-data";

const number = (max = 1_000_000) => z.number().min(0).max(max);
export const starterPackIds = ["basic", "sports", "champ"] as const;
export type StarterPackId = typeof starterPackIds[number];
export type PackId = string;
export const customPackIdPattern = /^mix-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function isStarterPack(id: string): id is StarterPackId {
  return starterPackIds.includes(id as StarterPackId);
}
export const ingredientSchema = z.object({
  id: z.string().min(1).max(80), name: z.string().trim().min(1).max(80),
  grams: number(100_000), packSize: number(100_000).positive(), packPrice: number(),
  source: z.string().max(500),
  nutrition: nutritionSchema.nullable().optional(),
});
export const costSchema = z.object({
  id: z.string().min(1).max(80), name: z.string().trim().min(1).max(80),
  amount: number(), basis: z.enum(["pack", "batch", "month"]),
});
export const recipeSchema = z.object({
  name: z.string().trim().min(1).max(60), note: z.string().max(1000),
  packGrams: number(10_000).positive(), yieldPercent: number(100).min(1),
  servingGrams: number(10_000).positive().optional(),
  ingredients: z.array(ingredientSchema).min(1).max(40),
  costs: z.array(costSchema).max(30),
  batchPacks: number(10_000).int().min(1), batchHours: number(1000), hourlyCost: number(100_000),
  wastePercent: number(100), price: number(100_000), feePercent: number(100), retailerPercent: number(100),
  monthlyPacks: number(100_000).int(), sellThroughPercent: number(100),
}).superRefine((recipe, ctx) => {
  if (!recipe.ingredients.some(i => i.grams > 0)) ctx.addIssue({ code: "custom", message: "Add a positive ingredient quantity.", path: ["ingredients"] });
  for (const key of ["ingredients", "costs"] as const) {
    if (new Set(recipe[key].map(i => i.id)).size !== recipe[key].length) ctx.addIssue({ code: "custom", message: "Each row needs a unique ID.", path: [key] });
  }
  if (recipe.feePercent + recipe.retailerPercent > 100) ctx.addIssue({code:"custom", message:"Selling fees and retailer share cannot exceed 100%.", path:["retailerPercent"]});
});
export type Recipe = z.infer<typeof recipeSchema>;
export type Ingredient = Recipe["ingredients"][number];
export type OtherCost = Recipe["costs"][number];
export type SavedPack = { id: PackId; recipe: Recipe; version: number; updatedAt: string | null };
export type Revision = { version: number; recipe: Recipe; createdAt: string };

// Quantities describe a reference mix. Scale all ingredients proportionally to
// the requested finished pack weight and measured yield, without inventing mass.
export function calculate(recipe: Recipe) {
  const inputGrams = recipe.ingredients.reduce((sum, i) => sum + i.grams, 0);
  const scale = inputGrams > 0 && recipe.yieldPercent > 0 ? recipe.packGrams / (inputGrams * recipe.yieldPercent / 100) : 0;
  const rows = recipe.ingredients.map(i => ({ ...i, input: i.grams * scale, cost: i.packSize > 0 ? i.grams * scale / i.packSize * i.packPrice : 0 }));
  const ingredients = rows.reduce((sum, i) => sum + i.cost, 0);
  const waste = ingredients * recipe.wastePercent / 100;
  const labour = recipe.batchHours * recipe.hourlyCost / recipe.batchPacks;
  const otherPerPack = recipe.costs.reduce((sum, c) => sum + (c.basis === "pack" ? c.amount : c.basis === "batch" ? c.amount / recipe.batchPacks : 0), 0);
  const overhead = recipe.costs.filter(c => c.basis === "month").reduce((sum, c) => sum + c.amount, 0);
  const production = ingredients + waste + labour + otherPerPack;
  const retained = 1 - (recipe.feePercent + recipe.retailerPercent) / 100;
  const selling = recipe.price * (1 - retained);
  const contribution = recipe.price * retained - production;
  const margin = recipe.price > 0 ? contribution / recipe.price * 100 : null;
  const sold = Math.floor(recipe.monthlyPacks * recipe.sellThroughPercent / 100);
  const revenue = sold * recipe.price;
  const monthlyCost = recipe.monthlyPacks * production + sold * selling + overhead;
  const effectiveContribution = recipe.sellThroughPercent / 100 * recipe.price * retained - production;
  const breakEvenProduced = effectiveContribution > 0 ? Math.ceil(overhead / effectiveContribution) : null;
  const targetPrice = retained > 0.3 ? production / (retained - 0.3) : null;
  return { rows, inputGrams, scale, ingredients, waste, labour, otherPerPack, overhead, production, selling,
    contribution, margin, sold, revenue, monthlyCost, monthlyProfit: revenue - monthlyCost,
    breakEvenProduced, targetPrice, productionHours: recipe.monthlyPacks / recipe.batchPacks * recipe.batchHours };
}

const baseIngredients: Ingredient[] = [
  {id:"oats",name:"Oats",grams:180,packSize:500,packPrice:82,source:"Winners · Bokomo 500 g · 14 Sep 2026"},
  {id:"almonds",name:"Almonds",grams:30,packSize:200,packPrice:365,source:"Winners · Seeberger 200 g · 14 Sep 2026"},
  {id:"raisins",name:"Raisins",grams:45,packSize:250,packPrice:175,source:"Winners · Melissa 250 g · 14 Sep 2026"},
  {id:"honey",name:"Honey",grams:45,packSize:500,packPrice:250,source:"Allowance; current shelf price to confirm"},
  {id:"oil",name:"Sunflower oil",grams:18,packSize:920,packPrice:96,source:"Winners · Sunlife 1 litre ≈ 920 g · 14 Sep 2026"},
  {id:"seasoning",name:"Cinnamon + salt",grams:2,packSize:2,packPrice:2,source:"Allowance"},
];
const common = {
  packGrams:300, yieldPercent:93.75, batchPacks:20, batchHours:5, hourlyCost:200,
  wastePercent:5, feePercent:2, retailerPercent:0, monthlyPacks:100, sellThroughPercent:100,
  costs:[
    {id:"pouch",name:"Pouch + label",amount:20,basis:"pack"},
    {id:"energy",name:"Energy + cleaning",amount:160,basis:"batch"},
    {id:"shopping",name:"Shopping transport",amount:140,basis:"batch"},
    {id:"admin",name:"Order handling + admin",amount:2000,basis:"month"},
    {id:"wear",name:"Equipment wear + overhead",amount:1000,basis:"month"},
  ] as OtherCost[],
};
export function starterRecipe(id: StarterPackId): Recipe {
  const ingredients = structuredClone(baseIngredients);
  if (id === "sports") {
    ingredients[0].grams = 150;
    ingredients.push({id:"sunflower",name:"Sunflower seeds",grams:30,packSize:250,packPrice:112,source:"DodoFresh · NeoFoods 250 g · 14 Sep 2026; retail alternative"});
  }
  if (id === "champ") { ingredients[0].grams=165; ingredients[1].grams=60; ingredients[2].grams=30; }
  return structuredClone({...common, name: id === "basic" ? "Basic" : id === "sports" ? "Sports" : "Champ", ingredients,
    price: id === "basic" ? 350 : id === "sports" ? 375 : 425,
    note: id === "basic" ? "The everyday oat, almond and raisin mix. Start here and cost a real kitchen batch."
      : id === "sports" ? "A seed-forward recipe idea for after a session. A concept name, not a tested sports nutrition claim."
      : "A more generous almond mix. Test whether the taste earns a higher price.",
  });
}
export function starterPacks(): SavedPack[] { return starterPackIds.map(id => ({id,recipe:starterRecipe(id),version:0,updatedAt:null})); }

export function newRecipe(): Recipe {
  return structuredClone({ ...common, name: "New granola", note: "", price: 350,
    ingredients: [{id:"first-ingredient",name:"First ingredient",grams:300,packSize:500,packPrice:0,source:"Price to confirm"}],
  });
}

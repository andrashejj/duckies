import { z } from "zod";
import { nutritionSchema } from "./granola-nutrition-data";

const number = (max = 1_000_000) => z.number().min(0).max(max);
// The three printed flavours. Their ids double as the pouch designs
// (src/lib/granola-pouch.ts) and the shop slugs (src/data/shop.ts).
export const starterPackIds = ["the-og", "dawn-patrol", "power-up"] as const;
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
  discountPercent: number(100).optional(), sourcingCost: number().optional(),
  nutrition: nutritionSchema.nullable().optional(),
});
export const costSchema = z.object({
  id: z.string().min(1).max(80), name: z.string().trim().min(1).max(80),
  amount: number(), basis: z.enum(["pack", "batch", "month", "sold"]),
  calculation: z.enum(["money", "labour"]).optional(),
});
export const recipeSchema = z.object({
  name: z.string().trim().min(1).max(60), note: z.string().max(1000),
  packGrams: number(10_000).positive(), yieldPercent: number(100).min(1),
  servingGrams: number(10_000).positive().optional(),
  ingredients: z.array(ingredientSchema).min(1).max(40),
  costs: z.array(costSchema).max(30),
  batchCostMode: z.enum(["proportional", "whole"]).optional(),
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
export function calculate(recipe: Recipe, { includeBreakEven = true } = {}) {
  const inputGrams = recipe.ingredients.reduce((sum, i) => sum + i.grams, 0);
  const scale = recipe.packGrams / (inputGrams * recipe.yieldPercent / 100);
  const rows = recipe.ingredients.map(i => {
    const landedPrice = i.packPrice * (1 - (i.discountPercent ?? 0) / 100) + (i.sourcingCost ?? 0);
    return { ...i, input: i.grams * scale, landedPrice, cost: i.grams * scale / i.packSize * landedPrice };
  });
  const ingredients = rows.reduce((sum, i) => sum + i.cost, 0);
  const waste = ingredients * recipe.wastePercent / 100;
  const costRows = recipe.costs.map(c => ({ ...c, rate: c.amount * (c.calculation === "labour" ? recipe.hourlyCost : 1) }));
  const sumBasis = (basis: OtherCost["basis"]) => costRows.filter(c => c.basis === basis).reduce((sum, c) => sum + c.rate, 0);
  const perPack = sumBasis("pack"), perBatch = sumBasis("batch"), perSold = sumBasis("sold");
  const overhead = sumBasis("month");
  const labour = recipe.batchHours * recipe.hourlyCost / recipe.batchPacks;
  const otherPerPack = perPack + perBatch / recipe.batchPacks;
  // Unit economics use a full reference batch. Monthly economics pay for the
  // selected batch policy, including the unused capacity of the final batch.
  const production = ingredients + waste + labour + otherPerPack;
  const retained = 1 - (recipe.feePercent + recipe.retailerPercent) / 100;
  const selling = recipe.price * (1 - retained) + perSold;
  const contribution = recipe.price - selling - production;
  const margin = recipe.price > 0 ? contribution / recipe.price * 100 : null;
  const batchesAt = (packs: number) => recipe.batchCostMode === "whole" ? Math.ceil(packs / recipe.batchPacks) : packs / recipe.batchPacks;
  const productionAt = (packs: number) => packs * (ingredients + waste + perPack) + batchesAt(packs) * (recipe.batchHours * recipe.hourlyCost + perBatch);
  const profitAt = (packs: number) => {
    const sold = Math.floor(packs * recipe.sellThroughPercent / 100);
    return sold * recipe.price - (productionAt(packs) + sold * selling + overhead);
  };
  const batches = batchesAt(recipe.monthlyPacks);
  const sold = Math.floor(recipe.monthlyPacks * recipe.sellThroughPercent / 100);
  const revenue = sold * recipe.price;
  const monthlyProduction = productionAt(recipe.monthlyPacks);
  const monthlySelling = sold * selling;
  const monthlyCost = monthlyProduction + monthlySelling + overhead;
  const effectiveContribution = recipe.sellThroughPercent / 100 * (recipe.price * retained - perSold) - production;
  // Scan whole packs, not a rounded continuous approximation: sell-through
  // rounds down and starting another batch can temporarily reduce profit.
  let breakEvenProduced: number | null = null;
  if (includeBreakEven) {
    if (profitAt(0) >= 0) breakEvenProduced = 0;
    else if (effectiveContribution > 0) {
      const lowerBound = Math.max(1, Math.floor(overhead / effectiveContribution));
      for (let packs = lowerBound; packs <= 100_000; packs++) {
        if (profitAt(packs) >= 0) { breakEvenProduced = packs; break; }
      }
    }
  }
  const breakEvenPrice = sold > 0 && retained > 0 ? (monthlyProduction + sold * perSold + overhead) / (sold * retained) : null;
  const targetPrice = retained > 0.3 ? (production + perSold) / (retained - 0.3) : null;
  const monthlyRows = costRows.map(c => ({ ...c, monthly: c.rate * (c.basis === "pack" ? recipe.monthlyPacks : c.basis === "batch" ? batches : c.basis === "sold" ? sold : 1) }));
  const productionHours = batches * recipe.batchHours;
  const otherHours = monthlyRows.filter(c => c.calculation === "labour").reduce((sum, c) => sum + c.amount * (c.basis === "pack" ? recipe.monthlyPacks : c.basis === "batch" ? batches : c.basis === "sold" ? sold : 1), 0);
  return { rows, inputGrams, scale, ingredients, waste, labour, otherPerPack, overhead, production, selling,
    contribution, margin, sold, unsold: recipe.monthlyPacks - sold, revenue, monthlyCost, monthlyProfit: revenue - monthlyCost,
    breakEvenProduced, breakEvenPrice, targetPrice, productionHours, totalPaidHours: productionHours + otherHours,
    batches, monthlyProduction, monthlySelling, monthlyRows,
    monthlyIngredients: recipe.monthlyPacks * ingredients, monthlyWaste: recipe.monthlyPacks * waste,
    monthlyLabour: productionHours * recipe.hourlyCost, monthlyFees: sold * recipe.price * (1 - retained),
  };
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
  packGrams:300, yieldPercent:93.75, batchCostMode:"whole" as const, batchPacks:20, batchHours:5, hourlyCost:200,
  wastePercent:5, feePercent:2, retailerPercent:0, monthlyPacks:100, sellThroughPercent:100,
  costs:[
    {id:"pouch",name:"Pouch + label",amount:20,basis:"pack"},
    {id:"energy",name:"Energy + cleaning",amount:160,basis:"batch"},
    {id:"shopping",name:"Shopping transport",amount:140,basis:"batch"},
    {id:"admin",name:"Order handling + admin",amount:10,basis:"month",calculation:"labour"},
    {id:"wear",name:"Equipment wear + overhead",amount:1000,basis:"month"},
  ] as OtherCost[],
};
export const starterNames: Record<StarterPackId, string> = { "the-og": "The OG", "dawn-patrol": "Dawn Patrol", "power-up": "Power Up" };
export function starterRecipe(id: StarterPackId): Recipe {
  const ingredients = structuredClone(baseIngredients);
  if (id === "dawn-patrol") {
    ingredients[0].grams = 150;
    ingredients.push({id:"sunflower",name:"Sunflower seeds",grams:30,packSize:250,packPrice:112,source:"DodoFresh · NeoFoods 250 g · 14 Sep 2026; retail alternative"});
  }
  if (id === "power-up") { ingredients[0].grams=165; ingredients[1].grams=60; ingredients[2].grams=30; }
  return structuredClone({...common, name: starterNames[id], ingredients,
    price: id === "the-og" ? 350 : id === "dawn-patrol" ? 375 : 425,
    note: id === "the-og" ? "The original: oats, almonds, raisins and honey. Start here and cost a real kitchen batch."
      : id === "dawn-patrol" ? "Seed-forward for the early session. A recipe idea to test, not a tested sports nutrition claim."
      : "Double the almonds. Test whether the taste earns the higher price.",
  });
}
export function starterPacks(): SavedPack[] { return starterPackIds.map(id => ({id,recipe:starterRecipe(id),version:0,updatedAt:null})); }

export function newRecipe(): Recipe {
  return structuredClone({ ...common, name: "New granola", note: "", price: 350,
    ingredients: [{id:"first-ingredient",name:"First ingredient",grams:300,packSize:500,packPrice:0,source:"Price to confirm"}],
  });
}

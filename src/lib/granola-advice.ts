import { z } from "zod";
import { calculate, recipeSchema, type Recipe } from "./granola";
import { calculateNutrition } from "./granola-nutrition";

export const adviceSchema = z.object({
  summary:z.string().min(1).max(1200),
  suggestions:z.array(z.object({
    title:z.string().min(1).max(100),
    reason:z.string().min(1).max(700),
    tradeoff:z.string().min(1).max(700),
    changes:z.array(z.object({ingredientId:z.string().min(1).max(80),mixGrams:z.number().min(0).max(100000)})).min(1).max(10),
  })).max(3),
  nextSteps:z.array(z.string().min(1).max(500)).max(4),
});
export type Suggestion = z.infer<typeof adviceSchema>["suggestions"][number];
export function applySuggestion(recipe: Recipe, suggestion: Suggestion): Recipe {
  const ids=suggestion.changes.map(c=>c.ingredientId);
  if(new Set(ids).size!==ids.length||ids.some(id=>!recipe.ingredients.some(i=>i.id===id))) throw new Error("The suggestion refers to an invalid ingredient.");
  const next={...recipe,ingredients:recipe.ingredients.map(i=>{
    const change=suggestion.changes.find(c=>c.ingredientId===i.id);
    return change?{...i,grams:change.mixGrams}:i;
  })};
  return recipeSchema.parse(next);
}
export function adviceMetrics(recipe: Recipe) {
  const cost=calculate(recipe);
  return {ingredients:cost.ingredients,production:cost.production,contribution:cost.contribution,
    monthlyProfit:cost.monthlyProfit,nutrition:calculateNutrition(recipe)};
}
export type Advice = {
  summary:string;nextSteps:string[];model:string;generatedAt:string;
  before:ReturnType<typeof adviceMetrics>;
  suggestions:(Suggestion & {after:ReturnType<typeof adviceMetrics>})[];
};

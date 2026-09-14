import { calculate, type Recipe } from "./granola";
import { ingredientNutrition, nutrients, type NutrientKey } from "./granola-nutrition-data";

// Yield is assumed to be moisture loss. Nutrients in the edible inputs are
// retained; purchasing waste, packaging and paid time add no nutrition.
export function calculateNutrition(recipe: Recipe, grams = recipe.servingGrams ?? 50) {
  const cost = calculate(recipe);
  const rows = cost.rows.filter(i=>i.input>0).map(i=>({...i,nutrition:ingredientNutrition(i)}));
  const totalInput = rows.reduce((sum,i)=>sum+i.input,0);
  const values = Object.fromEntries(nutrients.map(({key})=>{
    const known = rows.filter(i=>i.nutrition?.values[key]!=null);
    const knownGrams = known.reduce((sum,i)=>sum+i.input,0);
    return [key,{
      value:known.length?known.reduce((sum,i)=>sum+i.input/100*i.nutrition!.values[key]!,0)*grams/recipe.packGrams:null,
      coverage:totalInput?knownGrams/totalInput*100:0,
      complete:rows.length>0&&known.length===rows.length,
      missing:rows.filter(i=>i.nutrition?.values[key]==null).map(i=>i.name),
    }];
  })) as Record<NutrientKey,{value:number|null;coverage:number;complete:boolean;missing:string[]}>;
  return {grams, servingsPerPack:recipe.packGrams/(recipe.servingGrams??50),values,
    complete: nutrients.every(n=>values[n.key].complete),
    missing: [...new Set(nutrients.flatMap(n=>values[n.key].missing))],
  };
}

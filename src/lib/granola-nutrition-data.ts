import { z } from "zod";

export const nutrients = [
  {key:"energy", label:"Energy", unit:"kcal", max:1000},
  {key:"fat", label:"Fat", unit:"g", max:100},
  {key:"saturatedFat", label:"Saturated fat", unit:"g", max:100},
  {key:"carbs", label:"Carbohydrate", unit:"g", max:100},
  {key:"sugars", label:"Total sugars", unit:"g", max:100},
  {key:"fibre", label:"Fibre", unit:"g", max:100},
  {key:"protein", label:"Protein", unit:"g", max:100},
  {key:"sodium", label:"Sodium", unit:"mg", max:100000},
] as const;
export type NutrientKey = typeof nutrients[number]["key"];
export const nutrientValuesSchema = z.object({
  energy:z.number().min(0).max(1000).nullable(), fat:z.number().min(0).max(100).nullable(),
  saturatedFat:z.number().min(0).max(100).nullable(), carbs:z.number().min(0).max(100).nullable(),
  sugars:z.number().min(0).max(100).nullable(), fibre:z.number().min(0).max(100).nullable(),
  protein:z.number().min(0).max(100).nullable(), sodium:z.number().min(0).max(100000).nullable(),
}).superRefine((v,ctx)=>{
  for(const [part,total] of [["saturatedFat","fat"],["sugars","carbs"],["fibre","carbs"]] as const) {
    if(v[part]!==null&&v[total]!==null&&v[part]>v[total]) ctx.addIssue({code:"custom",path:[part],message:`${part} cannot exceed ${total}.`});
  }
});
export const nutritionSchema = z.object({source:z.string().trim().min(1).max(500),values:nutrientValuesSchema});
export type Nutrition = z.infer<typeof nutritionSchema>;
export type NutrientValues = z.infer<typeof nutrientValuesSchema>;
export const emptyNutrients: NutrientValues = {energy:null,fat:null,saturatedFat:null,carbs:null,sugars:null,fibre:null,protein:null,sodium:null};
export const nutritionSourceUrl = "https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/dnload/sr28asc.zip";
// USDA National Nutrient Database for Standard Reference, Release 28 (2015).
// Extracted from FOOD_DES.txt and NUT_DATA.txt; values per 100 g edible input.
// Null means absent in the source (e.g. chia sugars), never an assumed zero.
export const nutritionProfiles: {id:string;name:string;aliases:string[];description:string;values:NutrientValues}[] = [
  {
    "id": "08120",
    "name": "Rolled oats",
    "aliases": [
      "oats",
      "rolled oats"
    ],
    "description": "Cereals, oats, regular and quick, not fortified, dry",
    "values": {
      "energy": 379.0,
      "protein": 13.15,
      "fat": 6.52,
      "carbs": 67.7,
      "fibre": 10.1,
      "sugars": 0.99,
      "sodium": 6.0,
      "saturatedFat": 1.11
    }
  },
  {
    "id": "12061",
    "name": "Almonds",
    "aliases": [
      "almonds"
    ],
    "description": "Nuts, almonds",
    "values": {
      "energy": 579.0,
      "protein": 21.15,
      "fat": 49.93,
      "carbs": 21.55,
      "fibre": 12.5,
      "sugars": 4.35,
      "sodium": 1.0,
      "saturatedFat": 3.802
    }
  },
  {
    "id": "09298",
    "name": "Raisins",
    "aliases": [
      "raisins"
    ],
    "description": "Raisins, seedless",
    "values": {
      "energy": 299.0,
      "protein": 3.07,
      "fat": 0.46,
      "carbs": 79.18,
      "fibre": 3.7,
      "sugars": 59.19,
      "sodium": 11.0,
      "saturatedFat": 0.058
    }
  },
  {
    "id": "19296",
    "name": "Honey",
    "aliases": [
      "honey"
    ],
    "description": "Honey",
    "values": {
      "energy": 304.0,
      "protein": 0.3,
      "fat": 0.0,
      "carbs": 82.4,
      "fibre": 0.2,
      "sugars": 82.12,
      "sodium": 4.0,
      "saturatedFat": 0.0
    }
  },
  {
    "id": "04506",
    "name": "Sunflower oil",
    "aliases": [
      "sunflower oil"
    ],
    "description": "Oil, sunflower, linoleic, (approx. 65%)",
    "values": {
      "energy": 884.0,
      "protein": 0.0,
      "fat": 100.0,
      "carbs": 0.0,
      "fibre": 0.0,
      "sugars": 0.0,
      "sodium": 0.0,
      "saturatedFat": 10.3
    }
  },
  {
    "id": "12036",
    "name": "Sunflower seeds",
    "aliases": [
      "sunflower seeds"
    ],
    "description": "Seeds, sunflower seed kernels, dried",
    "values": {
      "energy": 584.0,
      "protein": 20.78,
      "fat": 51.46,
      "carbs": 20.0,
      "fibre": 8.6,
      "sugars": 2.62,
      "sodium": 9.0,
      "saturatedFat": 4.455
    }
  },
  {
    "id": "02010",
    "name": "Ground cinnamon",
    "aliases": [
      "cinnamon",
      "ground cinnamon"
    ],
    "description": "Spices, cinnamon, ground",
    "values": {
      "energy": 247.0,
      "protein": 3.99,
      "fat": 1.24,
      "carbs": 80.59,
      "fibre": 53.1,
      "sugars": 2.17,
      "sodium": 10.0,
      "saturatedFat": 0.345
    }
  },
  {
    "id": "02047",
    "name": "Table salt",
    "aliases": [
      "salt",
      "table salt"
    ],
    "description": "Salt, table",
    "values": {
      "energy": 0.0,
      "protein": 0.0,
      "fat": 0.0,
      "carbs": 0.0,
      "fibre": 0.0,
      "sugars": 0.0,
      "sodium": 38758.0,
      "saturatedFat": 0.0
    }
  },
  {
    "id": "12014",
    "name": "Pumpkin seeds",
    "aliases": [
      "pumpkin seeds"
    ],
    "description": "Seeds, pumpkin and squash seed kernels, dried",
    "values": {
      "energy": 559.0,
      "protein": 30.23,
      "fat": 49.05,
      "carbs": 10.71,
      "fibre": 6.0,
      "sugars": 1.4,
      "sodium": 7.0,
      "saturatedFat": 8.659
    }
  },
  {
    "id": "12006",
    "name": "Chia seeds",
    "aliases": [
      "chia seeds"
    ],
    "description": "Seeds, chia seeds, dried",
    "values": {
      "energy": 486.0,
      "protein": 16.54,
      "fat": 30.74,
      "carbs": 42.12,
      "fibre": 34.4,
      "sugars": null,
      "sodium": 16.0,
      "saturatedFat": 3.33
    }
  },
  {
    "id": "12108",
    "name": "Unsweetened dried coconut",
    "aliases": [
      "coconut",
      "desiccated coconut"
    ],
    "description": "Nuts, coconut meat, dried (desiccated), not sweetened",
    "values": {
      "energy": 660.0,
      "protein": 6.88,
      "fat": 64.53,
      "carbs": 23.65,
      "fibre": 16.3,
      "sugars": 7.35,
      "sodium": 37.0,
      "saturatedFat": 57.218
    }
  }
];
export function profileNutrition(profile: typeof nutritionProfiles[number]): Nutrition {
  return {source:`USDA SR28 (2015), NDB ${profile.id}: ${profile.description}`,values:{...profile.values}};
}
export function ingredientNutrition(item:{name:string;nutrition?:Nutrition|null}): Nutrition|null {
  if(item.nutrition!==undefined) return item.nutrition;
  const profile=nutritionProfiles.find(p=>p.aliases.includes(item.name.trim().toLowerCase()));
  return profile?profileNutrition(profile):null;
}

import type { APIRoute } from "astro";
import { z } from "zod";
import { recipeSchema } from "../../../lib/granola";
import { GranolaError, granolaRoute, readGranolaBody, requireEditor } from "../../../lib/server/granola";
import { aiConfigured, generateAdvice } from "../../../lib/server/granola-ai";
import { json } from "../../../lib/server/http";

export const prerender=false;
export const GET:APIRoute=granolaRoute(()=>json({configured:aiConfigured()}));
const requestSchema=z.object({recipe:recipeSchema,goal:z.enum(["balanced","protein","less-sugar","lower-cost"]),brief:z.string().max(1000)});
export const POST:APIRoute=granolaRoute(async({request})=>{
  const userId=await requireEditor(request);
  const parsed=requestSchema.safeParse(await readGranolaBody(request));
  if(!parsed.success) throw new GranolaError("Check the recipe values and adviser brief before trying again.");
  return json({advice:await generateAdvice(parsed.data.recipe,parsed.data.goal,parsed.data.brief,userId)});
});

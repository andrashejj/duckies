import type { APIRoute } from "astro";
import { z } from "zod";
import { recipeSchema } from "../../../lib/granola";
import { granolaRoute, parsePackId, readGranolaBody, requireEditor, savePack } from "../../../lib/server/granola";
import { json } from "../../../lib/server/http";
export const prerender=false;
const schema=z.object({recipe:recipeSchema,version:z.number().int().min(0).max(2147483646)});
export const PUT: APIRoute=granolaRoute(async ({request,params})=>{
  const id=parsePackId(params.id);
  const userId=await requireEditor(request);
  const parsed=schema.safeParse(await readGranolaBody(request));
  if(!parsed.success)return json({error:parsed.error.issues[0]?.message??"Invalid recipe."},400);
  return json({pack:await savePack(id,parsed.data.recipe,parsed.data.version,userId)});
});

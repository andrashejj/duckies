import { getDatabase } from "./db";
import { getBrandingAccess } from "./branding";
import { json, sameOrigin } from "./http";
import { customPackIdPattern, isStarterPack, starterPacks, type PackId, type Recipe, type SavedPack } from "../granola";
import type { APIRoute } from "astro";

export class GranolaError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const granolaRoute = (handler: APIRoute): APIRoute => async context => {
  try {
    const access=context.locals.branding??await getBrandingAccess(context.request);
    context.locals.branding=access;
    if(!access.canView)throw new GranolaError("Branding access requires approval.",access.session?403:401);
    return await handler(context);
  }
  catch (error) {
    if (error instanceof GranolaError) return json({error:error.message},error.status);
    console.error("Granola storage request failed.");
    return json({error:"Saved recipes are temporarily unavailable. Your unsaved edits remain on this page. Please retry."},503);
  }
};
export function parsePackId(id: string | undefined): PackId {
  if (!id || (!isStarterPack(id) && !customPackIdPattern.test(id))) throw new GranolaError("Pack not found.",404);
  return id as PackId;
}
export async function requireEditor(request: Request) {
  const access = await getBrandingAccess(request);
  if (!access.session) throw new GranolaError("Sign in to save recipes.",401);
  if (!access.canEdit) throw new GranolaError("Recipe saving and AI require edit access from Andras.",403);
  if (!sameOrigin(request)) throw new GranolaError("Invalid request origin.",403);
  return access.session.user.id;
}
export async function readGranolaBody(request: Request) {
  const reader=request.body?.getReader();
  if(!reader) throw new GranolaError("A recipe is required.");
  const chunks: Uint8Array[]=[]; let size=0;
  while(true) {
    const {done,value}=await reader.read(); if(done) break;
    size+=value.length; if(size>64000){await reader.cancel();throw new GranolaError("Recipe is too large.",413);}
    chunks.push(value);
  }
  try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new GranolaError("Invalid JSON.");}
}
export async function listPacks(): Promise<SavedPack[]> {
  const result=await getDatabase().query("SELECT id,recipe,version,updated_at FROM granola_pack ORDER BY created_at,id");
  const defaults = starterPacks().map(defaultPack=>{
    const row=result.rows.find(row=>row.id===defaultPack.id);
    return row?{id:row.id,recipe:row.recipe,version:row.version,updatedAt:row.updated_at.toISOString()}:defaultPack;
  });
  const custom = result.rows.filter(row=>!isStarterPack(row.id)).map(row=>({
    id:row.id, recipe:row.recipe, version:row.version, updatedAt:row.updated_at.toISOString(),
  }));
  return [...defaults, ...custom];
}
export async function savePack(id: PackId, recipe: Recipe, expectedVersion: number, userId: string): Promise<SavedPack> {
  const client=await getDatabase().connect();
  try {
    await client.query("BEGIN");
    // Serializes the first insert as well as later updates for this pack.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`granola:${id}`]);
    const current=await client.query("SELECT version FROM granola_pack WHERE id=$1",[id]);
    if((current.rows[0]?.version??0)!==expectedVersion) throw new GranolaError("This pack was saved in another window. Load the latest version before saving; your edits are still here.",409);
    const version=expectedVersion+1;
    const result=await client.query(`INSERT INTO granola_pack(id,recipe,version,updated_by) VALUES($1,$2,$3,$4)
      ON CONFLICT(id) DO UPDATE SET recipe=EXCLUDED.recipe,version=EXCLUDED.version,updated_by=EXCLUDED.updated_by,updated_at=now()
      RETURNING updated_at`,[id,JSON.stringify(recipe),version,userId]);
    await client.query("INSERT INTO granola_revision(pack_id,version,recipe,created_by) VALUES($1,$2,$3,$4)",[id,version,JSON.stringify(recipe),userId]);
    await client.query("COMMIT");
    return {id,recipe,version,updatedAt:result.rows[0].updated_at.toISOString()};
  } catch(error){await client.query("ROLLBACK");throw error;} finally{client.release();}
}

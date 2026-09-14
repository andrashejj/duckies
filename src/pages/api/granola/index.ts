import type { APIRoute } from "astro";
import { granolaRoute, listPacks } from "../../../lib/server/granola";
import { json } from "../../../lib/server/http";
export const prerender=false;
export const GET: APIRoute=granolaRoute(async ({locals})=>{
  const packs=await listPacks();
  return json({packs,canEdit:Boolean(locals.branding?.canEdit)});
});

import type { APIRoute } from "astro";
import { granolaRoute, parsePackId } from "../../../../lib/server/granola";
import { getDatabase } from "../../../../lib/server/db";
import { json } from "../../../../lib/server/http";
export const prerender=false;
export const GET: APIRoute=granolaRoute(async ({params})=>{
  const id=parsePackId(params.id);
  const result=await getDatabase().query("SELECT version,recipe,created_at FROM granola_revision WHERE pack_id=$1 ORDER BY version DESC LIMIT 30",[id]);
  return json({revisions:result.rows.map(row=>({version:row.version,recipe:row.recipe,createdAt:row.created_at.toISOString()}))});
});

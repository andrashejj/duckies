import type { APIRoute } from "astro";
import { z } from "zod";
import { BRANDING_OWNER } from "../../../lib/branding";
import { getDatabase } from "../../../lib/server/db";
import { json } from "../../../lib/server/http";
import { brandingBody,brandingRoute,BrandingError,requireBrandingOrigin,requireBrandingOwner } from "../../../lib/server/branding";
export const prerender=false;
export const GET:APIRoute=brandingRoute(async({request})=>{
  await requireBrandingOwner(request);
  const r=await getDatabase().query("SELECT email,name,reason,status,can_edit,requested_at,decided_at,version FROM branding_access WHERE verified_at IS NOT NULL ORDER BY (status='pending') DESC,requested_at DESC");
  return json({requests:r.rows});
});
const decisionSchema=z.object({email:z.email().max(254).transform(v=>v.toLowerCase()),decision:z.enum(["approved","denied","revoked"]),canEdit:z.boolean(),version:z.number().int().positive()});
export const POST:APIRoute=brandingRoute(async({request})=>{
  requireBrandingOrigin(request);await requireBrandingOwner(request);
  const parsed=decisionSchema.safeParse(await brandingBody(request));
  if(!parsed.success)throw new BrandingError("Invalid access decision.");
  const {email,decision,canEdit,version}=parsed.data;
  if(email===BRANDING_OWNER)throw new BrandingError("The owner's access cannot be changed.",403);
  const client=await getDatabase().connect();
  try{
    await client.query("BEGIN");
    const r=await client.query(`UPDATE branding_access SET status=$2,can_edit=$3,decided_at=now(),decided_by=$4,version=version+1
      WHERE email=$1 AND version=$5 AND verified_at IS NOT NULL RETURNING email,status,can_edit`,[email,decision,decision==="approved"&&canEdit,BRANDING_OWNER,version]);
    if(!r.rowCount)throw new BrandingError("This request changed or is not verified. Refresh the list before deciding.",409);
    await client.query("INSERT INTO branding_access_event(email,status,can_edit,actor) VALUES($1,$2,$3,$4)",[email,decision,decision==="approved"&&canEdit,BRANDING_OWNER]);
    await client.query("COMMIT");return json({ok:true});
  }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
});

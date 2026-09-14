import type { APIRoute } from "astro";
import { BRANDING_OWNER } from "../../../lib/branding";
import { getDatabase } from "../../../lib/server/db";
import { json } from "../../../lib/server/http";
import { accessRequestSchema,brandingBody,brandingRoute,BrandingError,getBrandingAccess,limitBrandingRequests,requireBrandingOrigin } from "../../../lib/server/branding";
export const prerender=false;
export const POST:APIRoute=brandingRoute(async({request,clientAddress})=>{
  requireBrandingOrigin(request);
  const parsed=accessRequestSchema.safeParse(await brandingBody(request));
  if(!parsed.success)throw new BrandingError("Enter a valid email, name and a short message.");
  const {email,name,reason}=parsed.data;
  const access=await getBrandingAccess(request);
  if(access.email&&access.email!==email)throw new BrandingError("Use the email you are signed in with.",403);
  await limitBrandingRequests(clientAddress);
  const verified=Boolean(access.email===email);
  if(email!==BRANDING_OWNER){
    // Anonymous submissions cannot replace, revoke or resubmit an existing decision.
    await getDatabase().query(`INSERT INTO branding_access(email,name,reason,verified_at) VALUES($1,$2,$3,CASE WHEN $4 THEN now() ELSE NULL END)
      ON CONFLICT(email) DO UPDATE SET name=CASE WHEN $4 AND branding_access.status='pending' THEN EXCLUDED.name ELSE branding_access.name END,
      reason=CASE WHEN $4 AND branding_access.status='pending' THEN EXCLUDED.reason ELSE branding_access.reason END,
      verified_at=CASE WHEN $4 THEN COALESCE(branding_access.verified_at,now()) ELSE branding_access.verified_at END`,[email,name,reason,verified]);
  }
  if(!verified)return json({ok:true,verifyEmail:true});
  const current=await getBrandingAccess(request);
  return json({ok:true,status:current.owner?"approved":current.entry?.status??"pending"});
});

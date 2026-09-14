import { z } from "zod";
import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { BRANDING_OWNER, type BrandingStatus } from "../branding";
import { getSession } from "../session";
import { getDatabase } from "./db";
import { json, sameOrigin } from "./http";

export type BrandingEntry = {email:string;name:string;reason:string;status:BrandingStatus;can_edit:boolean;verified_at:Date|null;requested_at:Date;decided_at:Date|null;version:number};
export async function getBrandingAccess(request:Request) {
  const session=request.headers.has("cookie")?await getSession(request):null;
  const email=session?.user.email.trim().toLowerCase()??null;
  const owner=email===BRANDING_OWNER;
  const entry=email&&!owner?(await getDatabase().query<BrandingEntry>("SELECT * FROM branding_access WHERE email=$1",[email])).rows[0]??null:null;
  const canView=owner||Boolean(entry?.status==="approved"&&entry.verified_at);
  return {session,email,owner,entry,canView,canEdit:owner||Boolean(canView&&entry?.can_edit)};
}
export type BrandingAccess = Awaited<ReturnType<typeof getBrandingAccess>>;
export class BrandingError extends Error {constructor(message:string,public status=400){super(message);}}
export const brandingRoute=(handler:APIRoute):APIRoute=>async context=>{
  try{return await handler(context);}catch(error){
    if(error instanceof BrandingError)return json({error:error.message},error.status);
    console.error("Branding access request failed.");return json({error:"Access management is temporarily unavailable. Please retry."},503);
  }
};
export function requireBrandingOrigin(request:Request) {if(!sameOrigin(request))throw new BrandingError("Invalid request origin.",403);}
export async function requireBrandingOwner(request:Request) {
  const access=await getBrandingAccess(request);
  if(!access.session)throw new BrandingError("Please sign in.",401);
  if(!access.owner)throw new BrandingError("Only Andras can manage branding access.",403);
  return access;
}
export async function brandingBody(request:Request) {
  const reader=request.body?.getReader();if(!reader)throw new BrandingError("A request is required.");
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();throw new BrandingError("Request is too large.",413);}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new BrandingError("Invalid JSON.");}
}
export const accessRequestSchema=z.object({email:z.string().trim().pipe(z.email().max(254)).transform(v=>v.toLowerCase()),name:z.string().trim().min(1).max(80),reason:z.string().trim().max(1000)});
export async function limitBrandingRequests(address:string) {
  const key="branding-request:"+createHash("sha256").update(address).digest("hex");
  const r=await getDatabase().query(`INSERT INTO shop_request_limit(key,count,reset_at) VALUES($1,1,now()+interval '10 minutes')
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN shop_request_limit.reset_at<=now() THEN 1 ELSE shop_request_limit.count+1 END,
    reset_at=CASE WHEN shop_request_limit.reset_at<=now() THEN now()+interval '10 minutes' ELSE shop_request_limit.reset_at END RETURNING count`,[key]);
  if(r.rows[0].count>12)throw new BrandingError("Too many requests. Please try again in ten minutes.",429);
}

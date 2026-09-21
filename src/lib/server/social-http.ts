import type { APIRoute } from "astro";
import { GalleryError } from "./gallery";
import { json, sameOrigin } from "./http";
import { getSession } from "../session";
import type { SocialActor } from "./social";
export const socialRoute=(handler:(context:Parameters<APIRoute>[0],actor:SocialActor)=>ReturnType<APIRoute>):APIRoute=>async context=>{
  try {
    const session=await getSession(context.request);
    if(!session)throw new GalleryError('Please sign in.',401);
    if(!session.member)throw new GalleryError('Sharing is for active club members.',403);
    if(!['GET','HEAD'].includes(context.request.method)&&!sameOrigin(context.request))throw new GalleryError('Invalid request origin.',403);
    return await handler(context,{userId:session.user.id,email:session.member.email,role:session.member.role});
  }catch(error){
    if(error instanceof GalleryError)return json({error:error.message},error.status);
    console.error('Club sharing request failed.',error);return json({error:'Could not load or save this moment. Please try again.'},503);
  }
};
export async function socialBody(request:Request){
  const reader=request.body?.getReader();if(!reader)throw new GalleryError('Write something to share.');
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000){await reader.cancel();throw new GalleryError('That message is too long.',413);}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new GalleryError('Invalid message.');}
}

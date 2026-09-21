import { z } from 'zod';
import { uuid } from '../../../../lib/registration/schema';
import { socialRoute,socialBody } from '../../../../lib/server/social-http';
import { createPost,listPosts,socialWrite } from '../../../../lib/server/social';
import { GalleryError } from '../../../../lib/server/gallery';
import { json } from '../../../../lib/server/http';
export const prerender=false;
const input=z.object({body:z.string().trim().min(1).max(2000)}).strict();
export const GET=socialRoute(async({url},actor)=>{
  const before=url.searchParams.get('before')??undefined;
  if(before&&!uuid.safeParse(before).success)throw new GalleryError('Invalid page.');
  return json(await listPosts(actor,{before,author:url.searchParams.get('author')??undefined}));
});
export const POST=socialRoute(async({request},actor)=>{
  const data=input.safeParse(await socialBody(request));if(!data.success)throw new GalleryError('Write a message of up to 2,000 characters.');
  const id=await socialWrite(actor,db=>createPost(db,actor,data.data.body));return json({id},201);
});

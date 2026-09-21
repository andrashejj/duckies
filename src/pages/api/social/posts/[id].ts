import { z } from 'zod';
import { uuid } from '../../../../lib/registration/schema';
import { socialRoute,socialBody } from '../../../../lib/server/social-http';
import { listPosts,likePost,commentPost,postComments,removePostContent } from '../../../../lib/server/social';
import { GalleryError } from '../../../../lib/server/gallery';
import { json } from '../../../../lib/server/http';
export const prerender=false;
const idFor=(id:unknown)=>{const parsed=uuid.safeParse(id);if(!parsed.success)throw new GalleryError('Post not found.',404);return parsed.data;};
export const GET=socialRoute(async({params,url},actor)=>{
  const id=idFor(params.id);const before=url.searchParams.get('before');
  if(before&&!uuid.safeParse(before).success)throw new GalleryError("Invalid page.");
  const {posts}=await listPosts(actor,{id});if(!posts.length)throw new GalleryError('Post not found.',404);
  return json({post:posts[0],...await postComments(actor,id,before??undefined)});
});
export const PUT=socialRoute(async({params,request},actor)=>{
  const data=z.object({liked:z.boolean()}).strict().safeParse(await socialBody(request));
  if(!data.success)throw new GalleryError('Choose like or unlike.');
  await likePost(actor,idFor(params.id),data.data.liked);return json({ok:true});
});
export const POST=socialRoute(async({params,request},actor)=>{
  const data=z.object({body:z.string().trim().min(1).max(1000)}).strict().safeParse(await socialBody(request));
  if(!data.success)throw new GalleryError('Write a comment of up to 1,000 characters.');
  return json({id:await commentPost(actor,idFor(params.id),data.data.body)},201);
});
export const DELETE=socialRoute(async({params,url},actor)=>{
  const comment=url.searchParams.get('comment');if(comment)idFor(comment);
  await removePostContent(actor,idFor(params.id),comment??undefined);return json({ok:true});
});

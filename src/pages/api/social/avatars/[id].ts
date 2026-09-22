import { socialRoute } from '../../../../lib/server/social-http';
import { avatarImage } from '../../../../lib/server/social';
import { GalleryError } from '../../../../lib/server/gallery';
export const prerender=false;
// A club member's profile photo, for other members. Served no-store like every
// private read (see middleware); the version in the URL just makes a change show.
export const GET=socialRoute(async({params})=>{
  const image=await avatarImage(params.id??'');
  if(!image)throw new GalleryError('Photo not found.',404);
  return new Response(new Uint8Array(image),{headers:{'Content-Type':'image/webp','Content-Disposition':'inline; filename="member.webp"'}});
});

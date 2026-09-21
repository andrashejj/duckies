import type { APIRoute } from "astro";
import { archivedPhotoAccess } from "../../../lib/server/member-archive";
import { serveGalleryAsset } from "../../../lib/server/gallery-assets";
export const prerender = false;

// Curated gallery photos and clips. The middleware has already required a
// signed-in club member for anything under /gallery/.
export const GET: APIRoute = async ({ params, request, locals }) => {
  const path = params.path ?? "";
  if (!locals.session?.member) {
    if (!/^[a-z0-9-]+\.webp$/.test(path)) return new Response("Not found", {status:404});
    const key = `curated:${path.replace(/(-small)?\.webp$/, "")}`;
    try { if (!(await archivedPhotoAccess(locals.session!.user.email,key))) return new Response("Not found", {status:404}); }
    catch { return new Response("Unavailable", {status:503}); }
  }
  return serveGalleryAsset(path,request.headers.get("range"));
};

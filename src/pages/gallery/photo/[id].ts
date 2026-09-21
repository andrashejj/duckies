import type { APIRoute } from "astro";
import { archivedPhotoAccess } from "../../../lib/server/member-archive";
import { readImage } from "../../../lib/server/gallery";
import { uuid } from "../../../lib/registration/schema";
export const prerender = false;

// Serves a member's upload. The middleware has already required a signed-in
// club member; hidden (rejected) photos are only visible to an admin.
export const GET: APIRoute = async ({ params, url, locals }) => {
  const id = params.id?.replace(/\.webp$/, "") ?? "";
  if (!uuid.safeParse(id).success) return new Response("Not found", { status: 404 });
  const size = url.searchParams.get("size") === "thumb" ? "thumb" : "full";
  let row;
  try {
    if (!locals.session?.member && !(await archivedPhotoAccess(locals.session!.user.email, `upload:${id}`))) return new Response("Not found", { status: 404 });
    row = await readImage(id, size);
  } catch { return new Response("Unavailable", { status: 503 }); }
  if (!row || (row.status !== "approved" && !locals.isAdmin)) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.bytes), { headers: { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff" } });
};

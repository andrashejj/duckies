import type { APIRoute } from "astro";
import { getSession, isAdmin } from "../../../lib/session";
import { readImage } from "../../../lib/server/gallery";
import { uuid } from "../../../lib/registration/schema";
export const prerender = false;

// Serves a parent upload. Approved photos are public and cacheable; anything
// else is only visible to a signed-in admin reviewing it.
export const GET: APIRoute = async ({ params, request, url }) => {
  const id = params.id?.replace(/\.webp$/, "") ?? "";
  if (!uuid.safeParse(id).success) return new Response("Not found", { status: 404 });
  const size = url.searchParams.get("size") === "thumb" ? "thumb" : "full";
  let row;
  try { row = await readImage(id, size); } catch { return new Response("Unavailable", { status: 503 }); }
  if (!row) return new Response("Not found", { status: 404 });
  if (row.status !== "approved") {
    let admin = false;
    try { admin = isAdmin(await getSession(request)); } catch { admin = false; }
    if (!admin) return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new Response(new Uint8Array(row.bytes), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store" } });
  }
  return new Response(new Uint8Array(row.bytes), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, s-maxage=31536000", "X-Content-Type-Options": "nosniff" },
  });
};

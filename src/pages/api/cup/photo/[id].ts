import type { APIRoute } from "astro";
import { uuid } from "../../../../lib/registration/schema";
import { compRoute, CompError, judgeAccess, readEntrantPhoto } from "../../../../lib/server/comp";
export const prerender = false;

// A kid's profile photo for the judge sheet, so judges match faces to rashies.
// Judges and organisers only, and only for kids in the Cup.
export const GET: APIRoute = compRoute(async ({ request, params }) => {
  await judgeAccess(request);
  if (!uuid.safeParse(params.id).success) throw new CompError("Photo not found.", 404);
  const image = await readEntrantPhoto(params.id!);
  if (!image) throw new CompError("Photo not found.", 404);
  return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/webp", "Content-Disposition": 'inline; filename="surfer.webp"' } });
});

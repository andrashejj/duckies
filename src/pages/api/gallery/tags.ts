import type { APIRoute } from "astro";
import { z } from "zod";
import { uuid } from "../../../lib/registration/schema";
import { changePhotoTag, photoKids, photoTags } from "../../../lib/server/photo-profiles";
import { GalleryError } from "../../../lib/server/gallery";
import { json, sameOrigin } from "../../../lib/server/http";
export const prerender = false;
const input = z.object({ kidId: uuid, photoKey: z.string().min(1).max(160) }).strict();
const route = (handler: APIRoute): APIRoute => async context => {
  try {
    if (!context.locals.session?.member) throw new GalleryError("Please sign in as a club member.", 401);
    if (context.request.method !== "GET" && !sameOrigin(context.request)) throw new GalleryError("Invalid request origin.", 403);
    return await handler(context);
  } catch (error) {
    if (error instanceof GalleryError) return json({ error: error.message }, error.status);
    console.error("Photo tags could not be loaded or saved.");
    return json({ error: "Photo tags are temporarily unavailable. Please retry." }, 503);
  }
};
export const GET = route(async ({ locals }) => {
  const actor = locals.session!.member!;
  const [kids, tags] = await Promise.all([photoKids(actor), photoTags(actor)]);
  return json({ kids, tags });
});
const mutate = (remove: boolean) => route(async ({ request, locals }) => {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new GalleryError("Choose a photo and a duckie.");
  await changePhotoTag(locals.session!.member!, parsed.data.kidId, parsed.data.photoKey, remove);
  return json({ ok: true });
});
export const POST = mutate(false);
export const DELETE = mutate(true);

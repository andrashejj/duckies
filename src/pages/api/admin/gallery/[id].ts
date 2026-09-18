import type { APIRoute } from "astro";
import { uuid } from "../../../../lib/registration/schema";
import { cleanText, deleteUpload, GalleryError, galleryStatuses, reviewUpload, type GalleryStatus } from "../../../../lib/server/gallery";
import { json } from "../../../../lib/server/http";
export const prerender = false;

// The middleware already requires an admin session and a same-origin request here.
const guard = (handler: APIRoute): APIRoute => async (context) => {
  try {
    if (!uuid.safeParse(context.params.id).success) throw new GalleryError("Photo not found.", 404);
    return await handler(context);
  } catch (error) {
    if (error instanceof GalleryError) return json({ error: error.message }, error.status);
    console.error("Gallery review failed.", error);
    return json({ error: "The gallery service is temporarily unavailable." }, 503);
  }
};

export const PATCH = guard(async ({ params, request, locals }) => {
  const body = await request.json().catch(() => ({})) as { status?: unknown; caption?: unknown };
  const status = typeof body.status === "string" && (galleryStatuses as readonly string[]).includes(body.status) ? body.status as GalleryStatus : undefined;
  if (body.status !== undefined && !status) throw new GalleryError("Unknown status.");
  const patch: { status?: GalleryStatus; caption?: string | null } = {};
  if (status) patch.status = status;
  if (body.caption !== undefined) patch.caption = cleanText(body.caption, 200);
  return json(await reviewUpload(params.id!, patch, locals.session?.user.email ?? "admin"));
});

export const DELETE = guard(async ({ params }) => {
  await deleteUpload(params.id!);
  return json({ ok: true });
});

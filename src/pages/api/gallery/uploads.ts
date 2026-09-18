import type { APIRoute } from "astro";
import { sha256 } from "../../../lib/registration/records";
import { sendNewUploadAdminAlert } from "../../../lib/email/send";
import { cleanText, GalleryError, galleryRateLimit, insertUpload, readUpload } from "../../../lib/server/gallery";
import { json, sameOrigin } from "../../../lib/server/http";
export const prerender = false;

// One photo per request, raw bytes in the body, an optional note as a query
// parameter so the body can stream straight into sharp. The middleware has
// already required a signed-in club member; their email goes on the row.
export const POST: APIRoute = async ({ request, clientAddress, url, locals }) => {
  try {
    if (!sameOrigin(request)) throw new GalleryError("Invalid request origin.", 403);
    const member = locals.session?.member;
    if (!member) throw new GalleryError("Please sign in as a club member.", 401);
    await galleryRateLimit(clientAddress);
    const note = cleanText(url.searchParams.get("note"), 280);
    const photo = await readUpload(request);
    const id = await insertUpload({ uploadedBy: member.email, note, ipHash: sha256(`gallery:${process.env.BETTER_AUTH_SECRET}:${clientAddress}`), ...photo });
    void sendNewUploadAdminAlert({ id, note });
    return json({ id }, 201);
  } catch (error) {
    if (error instanceof GalleryError) return json({ error: error.message }, error.status);
    console.error("Gallery upload failed.", error);
    return json({ error: "The photo could not be saved right now. Please try again in a minute." }, 503);
  }
};

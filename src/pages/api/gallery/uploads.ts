import type { APIRoute } from "astro";
import { sha256 } from "../../../lib/registration/records";
import { sendNewUploadAdminAlert } from "../../../lib/email/send";
import { cleanText, GalleryError, galleryRateLimit, insertUpload, readUpload } from "../../../lib/server/gallery";
import { json, sameOrigin } from "../../../lib/server/http";
export const prerender = false;

// One photo per request, raw bytes in the body; who sent it and any note come
// as query parameters so the body can stream straight into sharp.
export const POST: APIRoute = async ({ request, clientAddress, url }) => {
  try {
    if (!sameOrigin(request)) throw new GalleryError("Invalid request origin.", 403);
    await galleryRateLimit(clientAddress);
    const uploaderName = cleanText(url.searchParams.get("name"), 80);
    const note = cleanText(url.searchParams.get("note"), 280);
    const photo = await readUpload(request);
    const id = await insertUpload({ uploaderName, note, ipHash: sha256(`gallery:${process.env.BETTER_AUTH_SECRET}:${clientAddress}`), ...photo });
    void sendNewUploadAdminAlert({ id, uploaderName, note });
    return json({ id }, 201);
  } catch (error) {
    if (error instanceof GalleryError) return json({ error: error.message }, error.status);
    console.error("Gallery upload failed.", error);
    return json({ error: "The photo could not be saved right now. Please try again in a minute." }, 503);
  }
};

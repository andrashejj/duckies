import type { APIRoute } from "astro";
import { lockActiveMember, createPost } from "../../../lib/server/social";
import { sha256 } from "../../../lib/registration/records";
import { sendNewUploadAdminAlert } from "../../../lib/email/send";
import { cleanText, GalleryError, galleryRateLimit, insertUpload, readUpload } from "../../../lib/server/gallery";
import { json, sameOrigin } from "../../../lib/server/http";
import { getDatabase } from "../../../lib/server/db";
import { requireManagedKid, writePhotoTag } from "../../../lib/server/photo-profiles";
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
    const input = { uploadedBy: member.email, note, ipHash: sha256(`gallery:${process.env.BETTER_AUTH_SECRET}:${clientAddress}`), ...photo };
    const kidId = url.searchParams.get("kid");
    let id: string;
    let postId: string;
    const db = await getDatabase().connect();
    try {
      await db.query("BEGIN");
      const role = await lockActiveMember(db,member.email);
      const actor = {...member,role};
      if (kidId !== null) await requireManagedKid(db,actor,kidId);
      id = await insertUpload(input,db);
      if (kidId !== null) await writePhotoTag(db,actor,kidId,`upload:${id}`);
      postId = await createPost(db,{...member,userId:locals.session!.user.id},note ?? "",id);
      await db.query("COMMIT");
    } catch(error) { await db.query("ROLLBACK"); throw error; }
    finally { db.release(); }
    void sendNewUploadAdminAlert({ id, note });
    return json({ id, postId }, 201);
  } catch (error) {
    if (error instanceof GalleryError) return json({ error: error.message }, error.status);
    console.error("Gallery upload failed.", error);
    return json({ error: "The photo could not be saved right now. Please try again in a minute." }, 503);
  }
};

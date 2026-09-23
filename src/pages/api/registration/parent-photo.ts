import { z } from "zod";
import {
  bearer,
  linkInfo,
  RegistrationError,
} from "../../../lib/registration/records";
import { readPhoto } from "../../../lib/registration/photos";
import {
  registrationRateLimit,
  safeRoute,
} from "../../../lib/registration/http";
import { getDatabase } from "../../../lib/server/db";
import { json, sameOrigin } from "../../../lib/server/http";
export const prerender = false;
const update = safeRoute(async ({ request, url, clientAddress }) => {
  if (!sameOrigin(request))
    throw new RegistrationError("Invalid request origin.", 403);
  await registrationRateLimit(clientAddress);
  const hash = bearer(request);
  await linkInfo(hash); // A signed link stays open for corrections until it expires.
  const parsedEmail = z.string().trim().toLowerCase().pipe(z.email().max(200)).safeParse(url.searchParams.get("email"));
  if (!parsedEmail.success) throw new RegistrationError("Enter this guardian's email before adding their photo.");
  const email = parsedEmail.data;
  const image = request.method === "PUT" ? await readPhoto(request) : null;
  const db = await getDatabase().connect();
  try {
    await db.query("BEGIN");
    const { rows } = await db.query(
      `SELECT l.id FROM club_registration_link l LEFT JOIN club_kid k ON k.id=l.kid_id WHERE l.token_hash=$1 AND l.revoked_at IS NULL AND l.expires_at>now() AND (l.kid_id IS NULL OR k.archived_at IS NULL) FOR UPDATE OF l`,
      [hash],
    );
    if (!rows[0])
      throw new RegistrationError(
        "This invitation is no longer available for photo uploads.",
        404,
      );
    if (image)
      await db.query(
        "INSERT INTO club_registration_parent_photo(link_id,email,image) VALUES($1,$2,$3) ON CONFLICT(link_id,email) DO UPDATE SET image=$3,uploaded_at=now()",
        [rows[0].id, email, image],
      );
    else
      await db.query(
        "DELETE FROM club_registration_parent_photo WHERE link_id=$1 AND email=$2",
        [rows[0].id, email],
      );
    await db.query(
      "DELETE FROM club_registration_parent_photo p USING club_registration_link l WHERE p.link_id=l.id AND (l.expires_at<now() OR l.revoked_at IS NOT NULL)",
    );
    await db.query("COMMIT");
    return json({ success: true });
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
});
export const PUT = update;
export const DELETE = update;

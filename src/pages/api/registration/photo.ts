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
const update = safeRoute(async ({ request, clientAddress }) => {
  if (!sameOrigin(request))
    throw new RegistrationError("Invalid request origin.", 403);
  await registrationRateLimit(clientAddress);
  const hash = bearer(request);
  await linkInfo(hash); // A signed link stays open for corrections until it expires.
  const image = request.method === "PUT" ? await readPhoto(request) : null;
  const db = await getDatabase().connect();
  try {
    await db.query("BEGIN");
    const { rows } = await db.query(
      `SELECT l.id FROM club_registration_link l JOIN club_kid k ON k.id=l.kid_id WHERE l.token_hash=$1 AND l.revoked_at IS NULL AND l.expires_at>now() AND k.archived_at IS NULL FOR UPDATE OF l`,
      [hash],
    );
    if (!rows[0])
      throw new RegistrationError(
        "This invitation is no longer available for photo uploads.",
        404,
      );
    if (image)
      await db.query(
        "INSERT INTO club_registration_photo(link_id,image) VALUES($1,$2) ON CONFLICT(link_id) DO UPDATE SET image=$2,uploaded_at=now()",
        [rows[0].id, image],
      );
    else
      await db.query("DELETE FROM club_registration_photo WHERE link_id=$1", [
        rows[0].id,
      ]);
    await db.query(
      "DELETE FROM club_registration_photo p USING club_registration_link l WHERE p.link_id=l.id AND (l.expires_at<now() OR l.revoked_at IS NOT NULL)",
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

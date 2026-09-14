import {
  requireOrganiser,
  safeRoute,
  registrationRateLimit,
} from "../../../../lib/registration/http";
import { RegistrationError } from "../../../../lib/registration/records";
import { readPhoto } from "../../../../lib/registration/photos";
import { uuid } from "../../../../lib/registration/schema";
import { getDatabase } from "../../../../lib/server/db";
import { json } from "../../../../lib/server/http";
export const prerender = false;
export const GET = safeRoute(async ({ request, params }) => {
  await requireOrganiser(request);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("Photo not found.", 404);
  const { rows } = await getDatabase().query(
    "SELECT image FROM club_kid_photo p JOIN club_kid k ON k.id=p.kid_id WHERE kid_id=$1 AND k.archived_at IS NULL",
    [params.id],
  );
  if (!rows[0]) throw new RegistrationError("Photo not found.", 404);
  return new Response(new Uint8Array(rows[0].image), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Disposition": 'inline; filename="profile.webp"',
    },
  });
});
export const PUT = safeRoute(async ({ request, params, clientAddress }) => {
  const member = await requireOrganiser(request, true);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("Duckie not found.", 404);
  await registrationRateLimit(clientAddress);
  const image = await readPhoto(request);
  const db = await getDatabase().connect();
  try {
    await db.query("BEGIN");
    if (
      !(
        await db.query(
          "SELECT id FROM club_kid WHERE id=$1 AND archived_at IS NULL FOR UPDATE",
          [params.id],
        )
      ).rowCount
    )
      throw new RegistrationError("Duckie not found.", 404);
    await db.query(
      `INSERT INTO club_kid_photo(kid_id,image,uploaded_by,source) VALUES($1,$2,$3,'organiser') ON CONFLICT(kid_id) DO UPDATE SET image=$2,uploaded_by=$3,source='organiser',updated_at=now()`,
      [params.id, image, member.userId],
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
export const DELETE = safeRoute(async ({ request, params }) => {
  await requireOrganiser(request, true);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("Duckie not found.", 404);
  await getDatabase().query("DELETE FROM club_kid_photo WHERE kid_id=$1", [
    params.id,
  ]);
  return json({ success: true });
});

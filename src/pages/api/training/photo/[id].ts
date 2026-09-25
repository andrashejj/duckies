import { safeRoute } from "../../../../lib/registration/http";
import { RegistrationError } from "../../../../lib/registration/records";
import { uuid } from "../../../../lib/registration/schema";
import { canCallRoll } from "../../../../lib/club-points";
import { requireTrainingViewer } from "../../../../lib/server/coaches";
import { getDatabase } from "../../../../lib/server/db";
export const prerender = false;
// A duckie's portrait on the training page: every face for whoever calls the
// roll, and a member's own duckies otherwise.
export const GET = safeRoute(async ({ request, params }) => {
  const { email, access } = await requireTrainingViewer(request);
  if (!uuid.safeParse(params.id).success) throw new RegistrationError("Photo not found.", 404);
  const { rows } = await getDatabase().query(
    `SELECT image FROM club_kid_photo p JOIN club_kid k ON k.id=p.kid_id WHERE kid_id=$1 AND k.archived_at IS NULL
      AND ($2 OR EXISTS(SELECT 1 FROM club_current_guardian g WHERE g.kid_id=k.id AND g.email=$3))`, [params.id, canCallRoll(access), email]);
  if (!rows[0]) throw new RegistrationError("Photo not found.", 404);
  return new Response(new Uint8Array(rows[0].image), { headers: { "Content-Type": "image/webp", "Content-Disposition": 'inline; filename="duckie.webp"' } });
});

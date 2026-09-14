import { requireOrganiser, safeRoute } from "../../../../lib/registration/http";
import { RegistrationError } from "../../../../lib/registration/records";
import { uuid } from "../../../../lib/registration/schema";
import { getDatabase } from "../../../../lib/server/db";
import { json } from "../../../../lib/server/http";
export const prerender = false;
export const GET = safeRoute(async ({ request, params }) => {
  await requireOrganiser(request);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("Duckie not found.", 404);
  const db = getDatabase();
  const [waivers, payments] = await Promise.all([
    db.query(
      "SELECT id, term, signed_at FROM club_signed_waiver WHERE kid_id=$1 ORDER BY signed_at DESC",
      [params.id],
    ),
    db.query(
      "SELECT id,term,status,amount_mur,note,actor_email,recorded_at FROM club_payment_event WHERE kid_id=$1 ORDER BY recorded_at DESC",
      [params.id],
    ),
  ]);
  return json({ waivers: waivers.rows, payments: payments.rows });
});

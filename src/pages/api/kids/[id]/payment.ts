import {
  requireOrganiser,
  readBody,
  safeRoute,
} from "../../../../lib/registration/http";
import { RegistrationError, grantGuardianMembership } from "../../../../lib/registration/records";
import {
  paymentSchema,
  canManagePayments,
  uuid,
} from "../../../../lib/registration/schema";
import { getSemester } from "../../../../lib/registration/semesters";
import { getDatabase } from "../../../../lib/server/db";
import { json } from "../../../../lib/server/http";
export const prerender = false;
export const POST = safeRoute(async ({ request, params }) => {
  const member = await requireOrganiser(request, true);
  if (!canManagePayments(member.email))
    throw new RegistrationError("Only Andras can change payment status.", 403);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("Duckie not found.", 404);
  const parsed = paymentSchema.safeParse(await readBody(request));
  if (!parsed.success)
    throw new RegistrationError(
      "Enter a payment status, an optional amount, and a note.",
    );
  const p = parsed.data;
  await getSemester(p.term);
  const result = await getDatabase().query(
    `INSERT INTO club_payment_event (kid_id,term,status,amount_mur,note,actor_email)
    SELECT id,$2,$3,$4,$5,$6 FROM club_kid WHERE id=$1 AND archived_at IS NULL RETURNING id`,
    [params.id, p.term, p.status, p.amountMur, p.note, member.email],
  );
  if (!result.rowCount) throw new RegistrationError("Duckie not found.", 404);
  // The fee is what makes the family members; their guardians join the club with it.
  await grantGuardianMembership(getDatabase(), [params.id!]);
  return json({ success: true }, 201);
});

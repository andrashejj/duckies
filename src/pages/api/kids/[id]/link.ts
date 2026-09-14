import {
  issueLink,
  RegistrationError,
} from "../../../../lib/registration/records";
import { requireOrganiser, safeRoute } from "../../../../lib/registration/http";
import { uuid } from "../../../../lib/registration/schema";
import { getDatabase } from "../../../../lib/server/db";
import { json } from "../../../../lib/server/http";
export const prerender = false;
export const POST = safeRoute(async ({ request, params }) => {
  const member = await requireOrganiser(request, true);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("Duckie not found.", 404);
  return json(await issueLink(params.id!, member.userId), 201);
});
export const DELETE = safeRoute(async ({ request, params }) => {
  await requireOrganiser(request, true);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("Duckie not found.", 404);
  await getDatabase().query(
    "UPDATE club_registration_link SET revoked_at=now() WHERE kid_id=$1 AND revoked_at IS NULL",
    [params.id],
  );
  return json({ success: true });
});

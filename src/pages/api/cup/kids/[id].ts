import { registerGuardianKid } from "../../../../lib/registration/cup-entries";
import { requireSignedIn, safeRoute } from "../../../../lib/registration/http";
import { RegistrationError } from "../../../../lib/registration/records";
import { uuid } from "../../../../lib/registration/schema";
import { json } from "../../../../lib/server/http";
export const prerender = false;
export const POST = safeRoute(async ({ request, params }) => {
  const { email } = await requireSignedIn(request, true);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("That kid is not on a club registration under this email.", 404);
  return json(await registerGuardianKid(email, params.id!), 201);
});

import { RegistrationError, startDraft } from "../../../lib/registration/records";
import { safeRoute, signupRateLimit } from "../../../lib/registration/http";
import { json, sameOrigin } from "../../../lib/server/http";
export const prerender = false;
// Public: open a blank registration form. Nothing reaches the roster until the
// family signs it, but every draft is a row, so drafts share the sign-up budget.
export const POST = safeRoute(async ({ request, clientAddress }) => {
  if (!sameOrigin(request))
    throw new RegistrationError("Invalid request origin.", 403);
  await signupRateLimit(clientAddress);
  return json(await startDraft(), 201);
});

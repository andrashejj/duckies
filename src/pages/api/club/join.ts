import { readBody, safeRoute, signupRateLimit } from "../../../lib/registration/http";
import { RegistrationError } from "../../../lib/registration/records";
import { signupSchema } from "../../../lib/registration/schema";
import { joinClub } from "../../../lib/registration/signup";
import { json, sameOrigin } from "../../../lib/server/http";
export const prerender = false;
// Public: join the club. The kid is created pending and the family continues
// to the registration form; Andras confirms the payment later.
export const POST = safeRoute(async ({ request, clientAddress }) => {
  if (!sameOrigin(request))
    throw new RegistrationError("Invalid request origin.", 403);
  await signupRateLimit(clientAddress);
  const parsed = signupSchema.safeParse(await readBody(request));
  if (!parsed.success)
    throw new RegistrationError(
      parsed.error.issues[0]?.message ?? "Check the details and try again.",
    );
  return json(await joinClub(parsed.data), 201);
});

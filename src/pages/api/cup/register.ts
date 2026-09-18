import { registerCupGuest } from "../../../lib/registration/cup-entries";
import { readBody, safeRoute, signupRateLimit } from "../../../lib/registration/http";
import { RegistrationError } from "../../../lib/registration/records";
import { cupSignupSchema } from "../../../lib/registration/schema";
import { json, sameOrigin } from "../../../lib/server/http";
export const prerender = false;
// Public: a new family signing up for the cup, joining the club at the same
// time if they choose to. Members sign in and use /api/cup/kids instead.
export const POST = safeRoute(async ({ request, clientAddress }) => {
  if (!sameOrigin(request))
    throw new RegistrationError("Invalid request origin.", 403);
  await signupRateLimit(clientAddress);
  const parsed = cupSignupSchema.safeParse(await readBody(request));
  if (!parsed.success)
    throw new RegistrationError(
      parsed.error.issues[0]?.message ?? "Check the details and try again.",
    );
  const { join, ...signup } = parsed.data;
  return json(await registerCupGuest(signup, join), 201);
});

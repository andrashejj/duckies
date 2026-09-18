import { registerForCup } from "../../../lib/registration/cup-entries";
import { readBody, registrationRateLimit, safeRoute } from "../../../lib/registration/http";
import { RegistrationError } from "../../../lib/registration/records";
import { cupEntrySchema } from "../../../lib/registration/schema";
import { json, sameOrigin } from "../../../lib/server/http";
export const prerender = false;
// Public: the short sign-up on the cup page. Members land on the list straight
// away; cup-only kids get a private link to the full registration form.
export const POST = safeRoute(async ({ request, clientAddress }) => {
  if (!sameOrigin(request))
    throw new RegistrationError("Invalid request origin.", 403);
  await registrationRateLimit(clientAddress);
  const parsed = cupEntrySchema.safeParse(await readBody(request));
  if (!parsed.success)
    throw new RegistrationError(
      parsed.error.issues[0]?.message ?? "Check the details and try again.",
    );
  return json(await registerForCup(parsed.data), 201);
});

import { familyProfile, renameGuardian } from "../../../lib/registration/family";
import { readBody, requireSignedIn, safeRoute } from "../../../lib/registration/http";
import { RegistrationError } from "../../../lib/registration/records";
import { guardianNameSchema } from "../../../lib/registration/schema";
import { json } from "../../../lib/server/http";
export const prerender = false;

// A signed-in guardian's own family: their duckies, each one's signed record,
// payment history and Cup entry. Scoped by the email on the registration, so
// this never reaches the club roster.
export const GET = safeRoute(async ({ request }) => {
  const { email, name } = await requireSignedIn(request);
  return json(await familyProfile({ email, name }));
});

// The name the club greets them by. The address stays the identity.
export const PATCH = safeRoute(async ({ request }) => {
  const { userId } = await requireSignedIn(request, true);
  const parsed = guardianNameSchema.safeParse(await readBody(request));
  if (!parsed.success)
    throw new RegistrationError(parsed.error.issues[0]?.message ?? "Enter your name.");
  await renameGuardian(userId, parsed.data.name);
  return json({ name: parsed.data.name });
});

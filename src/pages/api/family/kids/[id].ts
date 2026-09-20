import { updateKidContact } from "../../../../lib/registration/family";
import { readBody, requireSignedIn, safeRoute } from "../../../../lib/registration/http";
import { RegistrationError } from "../../../../lib/registration/records";
import { contactSchema, uuid } from "../../../../lib/registration/schema";
import { json } from "../../../../lib/server/http";
export const prerender = false;

// How the club reaches this family about this duckie. The signed registration
// is untouched: these are the working contact details on the kid's card.
export const PATCH = safeRoute(async ({ request, params }) => {
  const { email } = await requireSignedIn(request, true);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("That duckie is not on a club registration under this email.", 404);
  const parsed = contactSchema.safeParse(await readBody(request));
  if (!parsed.success)
    throw new RegistrationError(parsed.error.issues[0]?.message ?? "Check the contact details.");
  await updateKidContact(email, params.id!, parsed.data);
  return json({ success: true, ...parsed.data });
});

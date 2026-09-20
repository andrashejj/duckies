import { guardianContact, guardianKids } from "../../../../lib/registration/cup-entries";
import { requireSignedIn, safeRoute } from "../../../../lib/registration/http";
import { json } from "../../../../lib/server/http";
export const prerender = false;
// A signed-in guardian's own kids, with whether each is a paid-up member and
// already on the cup list.
export const GET = safeRoute(async ({ request }) => {
  const { email } = await requireSignedIn(request);
  const [kids, contact] = await Promise.all([guardianKids(email), guardianContact(email)]);
  return json({ email, kids, contact });
});

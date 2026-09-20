import { requireSignedIn } from "../../../lib/registration/http";
import { parentProfileSchema } from "../../../lib/parent-profile";
import { compRoute, readCompBody } from "../../../lib/server/comp";
import { readOwnProfile, saveParentProfile } from "../../../lib/server/parent-profiles";
import { json } from "../../../lib/server/http";
export const prerender = false;
export const GET = compRoute(async ({ request }) => { const { email } = await requireSignedIn(request); return json(await readOwnProfile(email)); });
export const PUT = compRoute(async ({ request }) => {
  const { email } = await requireSignedIn(request, true);
  const parsed = parentProfileSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: "Enter your name and a phone number up to 40 characters." }, 400);
  await saveParentProfile(email, parsed.data);
  return json(await readOwnProfile(email));
});

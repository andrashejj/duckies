import { z } from "zod";
import { readBody, requireOrganiser, safeRoute } from "../../../../lib/registration/http";
import { RegistrationError } from "../../../../lib/registration/records";
import { addCoach, readCoaches } from "../../../../lib/server/coaches";
import { json } from "../../../../lib/server/http";
export const prerender = false;
const coach = z.object({ email: z.email().max(254), name: z.string().trim().min(1).max(120).optional() }).strict();
export const GET = safeRoute(async ({ request }) => {
  await requireOrganiser(request);
  return json({ coaches: await readCoaches() });
});
// Pick a parent or volunteer (their profile supplies the name), or add an outside trainer by email and name.
export const POST = safeRoute(async ({ request }) => {
  const actor = await requireOrganiser(request, true);
  const parsed = coach.safeParse(await readBody(request));
  if (!parsed.success) throw new RegistrationError("Choose a parent or volunteer, or enter a valid email and name.");
  await addCoach(parsed.data.email, parsed.data.name, actor.email);
  return json({ coaches: await readCoaches() }, 201);
});

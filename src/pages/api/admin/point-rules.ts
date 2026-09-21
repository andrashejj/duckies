import { z } from "zod";
import { readBody, requireOrganiser, safeRoute } from "../../../lib/registration/http";
import { RegistrationError } from "../../../lib/registration/records";
import { savePointRules } from "../../../lib/server/club-points";
import { json } from "../../../lib/server/http";
export const prerender = false;
const value = z.number().int().min(0).max(1000);
const rules = z.object({ training: value, granola: value, cup: value }).strict();
export const PUT = safeRoute(async ({ request }) => {
  const actor = await requireOrganiser(request, true);
  const parsed = rules.safeParse(await readBody(request));
  if (!parsed.success) throw new RegistrationError("Use whole point values from 0 to 1,000.");
  await savePointRules(parsed.data, actor.email);
  return json({ success: true });
});

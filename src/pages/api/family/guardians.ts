import { z } from "zod";
import { guardianSchema, emailSchema, uuid } from "../../../lib/registration/schema";
import { changeGuardian, guardiansForActor } from "../../../lib/registration/guardians";
import { readBody, requireSignedIn, safeRoute, registrationRateLimit } from "../../../lib/registration/http";
import { RegistrationError } from "../../../lib/registration/records";
import { json } from "../../../lib/server/http";
export const prerender = false;
const kids = z.array(uuid).min(1).max(20).refine(ids => new Set(ids).size === ids.length);
const add = z.object({ kidIds: kids, guardian: guardianSchema, confirm: z.literal(true) }).strict();
const remove = z.object({ kidIds: kids, email: emailSchema }).strict();
export const POST = safeRoute(async ({ request, clientAddress }) => {
  const { email } = await requireSignedIn(request, true);
  await registrationRateLimit(clientAddress);
  const parsed = add.safeParse(await readBody(request));
  if (!parsed.success) throw new RegistrationError("Enter the guardian's details, choose their duckies and confirm shared access.");
  await changeGuardian(email, parsed.data.kidIds, parsed.data.guardian);
  return json({ success: true }, 201);
});
export const DELETE = safeRoute(async ({ request }) => {
  const { email } = await requireSignedIn(request, true);
  const parsed = remove.safeParse(await readBody(request));
  if (!parsed.success) throw new RegistrationError("Choose a guardian and their duckies.");
  await changeGuardian(email, parsed.data.kidIds, { email: parsed.data.email }, true);
  return json({ success: true });
});

export const GET = safeRoute(async ({ request, url }) => {
  const { email } = await requireSignedIn(request);
  const parsed = kids.safeParse(url.searchParams.getAll("kidId"));
  if (!parsed.success) throw new RegistrationError("Choose their duckies.");
  return json({ guardians: await guardiansForActor(email, parsed.data) });
});

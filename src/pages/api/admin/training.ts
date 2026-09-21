import { z } from "zod";
import { readBody, requireOrganiser, safeRoute } from "../../../lib/registration/http";
import { RegistrationError } from "../../../lib/registration/records";
import { clubToday } from "../../../lib/club-points";
import { markAttendance, trainingBoard } from "../../../lib/server/club-points";
import { json } from "../../../lib/server/http";
export const prerender = false;
const dateSchema = z.iso.date();
const update = z.object({ date: dateSchema, kidId: z.uuid(), present: z.boolean() }).strict();
export const GET = safeRoute(async ({ request, url }) => {
  const actor = await requireOrganiser(request);
  const date = dateSchema.safeParse(url.searchParams.get("date") ?? clubToday());
  if (!date.success) throw new RegistrationError("Choose a valid training date.");
  return json(await trainingBoard(date.data, actor.email));
});
export const PATCH = safeRoute(async ({ request }) => {
  const actor = await requireOrganiser(request, true);
  const parsed = update.safeParse(await readBody(request));
  if (!parsed.success) throw new RegistrationError("Choose a valid date and duckie.");
  const { date, kidId, present } = parsed.data;
  await markAttendance(date, kidId, present, actor.email);
  return json(await trainingBoard(date, actor.email));
});

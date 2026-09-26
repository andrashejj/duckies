import { z } from "zod";
import { readBody, safeRoute } from "../../../lib/registration/http";
import { RegistrationError } from "../../../lib/registration/records";
import { clubToday } from "../../../lib/club-points";
import { markAttendance, trainingBoard } from "../../../lib/server/club-points";
import { requireRollCaller, requireTrainingViewer } from "../../../lib/server/coaches";
import { json } from "../../../lib/server/http";
export const prerender = false;
// Training in the club: members read the roll and the leaderboard, organisers
// and selected coaches call the roll.
const dateSchema = z.iso.date();
const sessionTypeSchema = z.enum(["sunset", "sunrise"]);
const update = z.object({ date: dateSchema, sessionType: sessionTypeSchema, kidIds: z.array(z.uuid()).min(1).max(300), present: z.boolean() }).strict();
export const GET = safeRoute(async ({ request, url }) => {
  const { email, access } = await requireTrainingViewer(request);
  const date = dateSchema.safeParse(url.searchParams.get("date") ?? clubToday());
  if (!date.success) throw new RegistrationError("Choose a valid training date.");
  const sessionType = sessionTypeSchema.safeParse(url.searchParams.get("sessionType") ?? "sunset");
  if (!sessionType.success) throw new RegistrationError("Choose Sunset or Sunrise Duckies.");
  return json(await trainingBoard(date.data, sessionType.data, email, access));
});
export const PATCH = safeRoute(async ({ request }) => {
  const { email, access } = await requireRollCaller(request, true);
  const parsed = update.safeParse(await readBody(request));
  if (!parsed.success) throw new RegistrationError("Choose a valid date and duckie.");
  const { date, sessionType, kidIds, present } = parsed.data;
  await markAttendance(date, sessionType, kidIds, present, email);
  return json(await trainingBoard(date, sessionType, email, access));
});

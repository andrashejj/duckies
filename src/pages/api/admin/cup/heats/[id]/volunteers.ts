import { volunteerReviewSchema } from "../../../../../../lib/comp";
import { uuid } from "../../../../../../lib/registration/schema";
import { compRoute, CompError, readCompBody, reviewVolunteer, loadState } from "../../../../../../lib/server/comp";
import { json } from "../../../../../../lib/server/http";
export const prerender = false;
export const PATCH = compRoute(async ({ params, request, locals }) => {
  if (!uuid.safeParse(params.id).success) throw new CompError("Heat not found.",404);
  const parsed = volunteerReviewSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: "Choose a volunteer and a decision." },400);
  await reviewVolunteer(params.id!,parsed.data.email,parsed.data.decision,locals.session!.user.email);
  return json(await loadState());
});

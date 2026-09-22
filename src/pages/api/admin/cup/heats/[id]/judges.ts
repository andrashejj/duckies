import type { APIRoute } from "astro";
import { heatJudgesSchema } from "../../../../../../lib/comp";
import { uuid } from "../../../../../../lib/registration/schema";
import { compRoute, CompError, loadState, readCompBody, setHeatJudges } from "../../../../../../lib/server/comp";
import { json } from "../../../../../../lib/server/http";
export const prerender = false;
export const PUT: APIRoute = compRoute(async ({ params, request, locals }) => {
  if (!uuid.safeParse(params.id).success) throw new CompError("Heat not found.", 404);
  const parsed = heatJudgesSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: "Select parents or volunteers for this heat." }, 400);
  await setHeatJudges(params.id!, parsed.data.judges, locals.session!.user.email);
  return json(await loadState());
});

import { z } from "zod";
import { compRoute, cupAccess, readCompBody, volunteerForHeat, loadJudgeState } from "../../../../lib/server/comp";
import { json } from "../../../../lib/server/http";
export const prerender = false;
export const POST = compRoute(async ({ request }) => {
  const user = await cupAccess(request);
  const parsed = z.object({ heatId: z.uuid() }).strict().safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: "Choose a heat." }, 400);
  await volunteerForHeat(parsed.data.heatId, user.email);
  return json(await loadJudgeState(user), 201);
});

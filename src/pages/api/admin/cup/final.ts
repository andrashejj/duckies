import { finalReviewSchema } from "../../../../lib/cup-planner";
import type { APIRoute } from "astro";
import { compRoute, drawFinalInDb, loadState, readCompBody } from "../../../../lib/server/comp";
import { json } from "../../../../lib/server/http";
export const prerender = false;

// Builds the final from the leaderboard as it stands right now.
export const POST: APIRoute = compRoute(async ({ request }) => {
  const body = await readCompBody(request);
  const parsed = finalReviewSchema.safeParse(body);
  if (!parsed.success && (!body || typeof body !== "object" || Object.keys(body).length)) return json({ error: "Provide the tied order and a decision reason, or an empty request." }, 400);
  await drawFinalInDb(undefined, parsed.success ? parsed.data : undefined);
  return json(await loadState(), 201);
});

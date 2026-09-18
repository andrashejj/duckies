import type { APIRoute } from "astro";
import { compRoute, drawFinalInDb, loadState } from "../../../../lib/server/comp";
import { json } from "../../../../lib/server/http";
export const prerender = false;

// Builds the final from the leaderboard as it stands right now.
export const POST: APIRoute = compRoute(async () => {
  await drawFinalInDb();
  return json(await loadState(), 201);
});

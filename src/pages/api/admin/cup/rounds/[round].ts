import type { APIRoute } from "astro";
import { roundParam } from "../../../../../lib/comp";
import { compRoute, CompError, deleteRoundInDb, loadState } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// Removes a round's heats (or the final) so it can be drawn again.
export const DELETE: APIRoute = compRoute(async ({ params }) => {
  const parsed = roundParam.safeParse(params.round);
  if (!parsed.success) throw new CompError("Round not found.", 404);
  await deleteRoundInDb(parsed.data);
  return json(await loadState());
});

import type { APIRoute } from "astro";
import { drawSchema } from "../../../../../lib/comp";
import { compRoute, drawRoundInDb, loadState, readCompBody } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// Draws (or redraws) one qualifying round and returns the whole board.
export const POST: APIRoute = compRoute(async ({ request }) => {
  const parsed = drawSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Choose a round." }, 400);
  await drawRoundInDb(parsed.data.round);
  return json(await loadState(), 201);
});

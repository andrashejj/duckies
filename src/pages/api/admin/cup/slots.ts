import type { APIRoute } from "astro";
import { slotMoveSchema } from "../../../../lib/comp";
import { compRoute, loadState, moveSlot, readCompBody } from "../../../../lib/server/comp";
import { json } from "../../../../lib/server/http";
export const prerender = false;

// Moves a kid into a heat, changes their rashie, or takes them out of the round (heatId null).
export const POST: APIRoute = compRoute(async ({ request }) => {
  const parsed = slotMoveSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid move." }, 400);
  await moveSlot(parsed.data);
  return json(await loadState());
});

import type { APIRoute } from "astro";
import { waveCreateSchema } from "../../../../../lib/comp";
import { addWave, compRoute, judgeAccess, readCompBody } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// Rates a numbered run in a heat assigned to the signed-in judge.
export const POST: APIRoute = compRoute(async ({ request }) => {
  const judge = await judgeAccess(request);
  const parsed = waveCreateSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Rate a run from 1 to 5 stars." }, 400);
  return json({ wave: await addWave(judge.email, parsed.data) }, 201);
});

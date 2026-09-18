import type { APIRoute } from "astro";
import { waveCreateSchema } from "../../../../../lib/comp";
import { addWave, compRoute, judgeAccess, readCompBody } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// Scores the next wave a kid rode in a heat, as this judge saw it.
export const POST: APIRoute = compRoute(async ({ request }) => {
  const judge = await judgeAccess(request);
  const parsed = waveCreateSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Score a wave from 0.5 to 10, in halves." }, 400);
  return json({ wave: await addWave(judge.email, parsed.data) }, 201);
});

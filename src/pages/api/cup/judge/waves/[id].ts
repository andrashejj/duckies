import type { APIRoute } from "astro";
import { wavePatchSchema } from "../../../../../lib/comp";
import { uuid } from "../../../../../lib/registration/schema";
import { compRoute, CompError, deleteWave, judgeAccess, readCompBody, updateWave } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// A judge can correct or drop their own wave scores; nobody else's.
export const PATCH: APIRoute = compRoute(async ({ request, params }) => {
  if (!uuid.safeParse(params.id).success) throw new CompError("Wave not found.", 404);
  const judge = await judgeAccess(request);
  const parsed = wavePatchSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Rate a run from 1 to 5 stars." }, 400);
  return json({ wave: await updateWave(judge.email, params.id!, parsed.data.score) });
});

export const DELETE: APIRoute = compRoute(async ({ request, params }) => {
  if (!uuid.safeParse(params.id).success) throw new CompError("Wave not found.", 404);
  const judge = await judgeAccess(request);
  await deleteWave(judge.email, params.id!);
  return json({ success: true });
});

import type { APIRoute } from "astro";
import { heatPatchSchema } from "../../../../../lib/comp";
import { uuid } from "../../../../../lib/registration/schema";
import { compRoute, CompError, loadState, readCompBody, setHeatStatus } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// Start, finish or reset a heat. Starting and finishing post to the ticker.
export const PATCH: APIRoute = compRoute(async ({ params, request }) => {
  if (!uuid.safeParse(params.id).success) throw new CompError("Heat not found.", 404);
  const parsed = heatPatchSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid change." }, 400);
  await setHeatStatus(params.id!, parsed.data.status);
  return json(await loadState());
});

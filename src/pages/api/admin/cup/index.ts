import type { APIRoute } from "astro";
import { configPatchSchema } from "../../../../lib/comp";
import { compRoute, loadState, readCompBody, updateConfig } from "../../../../lib/server/comp";
import { json } from "../../../../lib/server/http";
export const prerender = false;

// The organiser board. The middleware already requires an organiser session
// and a same-origin request for every /api/admin write.
export const GET: APIRoute = compRoute(async () => json(await loadState()));

export const PATCH: APIRoute = compRoute(async ({ request }) => {
  const parsed = configPatchSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, 400);
  const { version, ...patch } = parsed.data;
  return json({ config: await updateConfig(patch, version) });
});

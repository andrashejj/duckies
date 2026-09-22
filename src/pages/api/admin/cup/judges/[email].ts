import type { APIRoute } from "astro";
import { compRoute, readJudges, removeJudge } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// Remove judge access. Saved scores stay and other account access is unchanged.
export const DELETE: APIRoute = compRoute(async ({ params }) => {
  await removeJudge(decodeURIComponent(params.email ?? ""));
  return json({ judges: await readJudges() });
});

import type { APIRoute } from "astro";
import { compRoute, readJudges, removeJudge } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// Uninvites a judge. Their scores stay; their sign-in stops working unless they are a member or customer.
export const DELETE: APIRoute = compRoute(async ({ params }) => {
  await removeJudge(decodeURIComponent(params.email ?? ""));
  return json({ judges: await readJudges() });
});

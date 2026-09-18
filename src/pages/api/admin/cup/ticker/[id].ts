import type { APIRoute } from "astro";
import { compRoute, readTicker, removeTicker } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

export const DELETE: APIRoute = compRoute(async ({ params }) => {
  await removeTicker(params.id ?? "");
  return json({ ticker: await readTicker() });
});

import type { APIRoute } from "astro";
import { tickerSchema } from "../../../../../lib/comp";
import { addNote, compRoute, readCompBody, readTicker } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// A note for the public ticker: "BBQ is on", "prize-giving at 18:00".
export const POST: APIRoute = compRoute(async ({ request }) => {
  const parsed = tickerSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Write something first." }, 400);
  await addNote(parsed.data.message);
  return json({ ticker: await readTicker() }, 201);
});

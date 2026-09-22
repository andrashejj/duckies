import type { APIRoute } from "astro";
import { judgeSchema } from "../../../../../lib/comp";
import { addJudge, compRoute, readCompBody, readJudges } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// Select an existing parent or volunteer; their profile supplies the name.
export const POST: APIRoute = compRoute(async ({ request, locals }) => {
  const parsed = judgeSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Select a parent or volunteer." }, 400);
  await addJudge(parsed.data.email, locals.session?.user.email ?? "organiser");
  return json({ judges: await readJudges() }, 201);
});

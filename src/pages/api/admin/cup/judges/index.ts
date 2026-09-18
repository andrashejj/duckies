import type { APIRoute } from "astro";
import { judgeSchema } from "../../../../../lib/comp";
import { addJudge, compRoute, readCompBody, readJudges } from "../../../../../lib/server/comp";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// Invites a judge by email; adding the same email again just renames them.
export const POST: APIRoute = compRoute(async ({ request, locals }) => {
  const parsed = judgeSchema.safeParse(await readCompBody(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Enter an email and a name." }, 400);
  await addJudge(parsed.data, locals.session?.user.email ?? "organiser");
  return json({ judges: await readJudges() }, 201);
});

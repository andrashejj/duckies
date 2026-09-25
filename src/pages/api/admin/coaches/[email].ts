import { requireOrganiser, safeRoute } from "../../../../lib/registration/http";
import { readCoaches, removeCoach } from "../../../../lib/server/coaches";
import { json } from "../../../../lib/server/http";
export const prerender = false;
export const DELETE = safeRoute(async ({ request, params }) => {
  await requireOrganiser(request, true);
  await removeCoach(decodeURIComponent(params.email ?? ""));
  return json({ coaches: await readCoaches() });
});

import { safeRoute } from "../../../lib/registration/http";
import { readParentProfiles } from "../../../lib/server/parent-profiles";
import { json } from "../../../lib/server/http";
export const prerender = false;
// Organiser access is enforced by the /api/admin middleware.
export const GET = safeRoute(async () => json({ parents: await readParentProfiles() }));

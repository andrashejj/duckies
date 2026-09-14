import type { APIRoute } from "astro";
import { getMemberSession } from "../../../lib/server/auth";
import { getDatabase } from "../../../lib/server/db";
import { json, parseName, sameOrigin } from "../../../lib/server/http";

export const prerender = false;
const update: APIRoute = async ({ request, params }) => {
  try {
    const member = await getMemberSession(request.headers);
    if (!member) return json({ error: "Please sign in." }, 401);
    if (member.role !== "organiser" || !sameOrigin(request)) return json({ error: "Organiser access required." }, 403);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id ?? "")) return json({ error: "Duckie not found." }, 404);
    if (request.method === "DELETE") {
      const result = await getDatabase().query("DELETE FROM club_kid WHERE id = $1 RETURNING id", [params.id]);
      return result.rowCount ? json({ success: true }) : json({ error: "Duckie not found." }, 404);
    }
    const body = await request.json().catch(() => null);
    const name = parseName(body?.name);
    if (!name) return json({ error: "Enter a name between 1 and 80 characters." }, 400);
    const result = await getDatabase().query("UPDATE club_kid SET name = $1 WHERE id = $2 RETURNING id, name", [name, params.id]);
    return result.rowCount ? json({ kid: result.rows[0] }) : json({ error: "Duckie not found." }, 404);
  } catch {
    console.error("Duckies roster update failed.");
    return json({ error: "Couldn't update this duckie. Please try again." }, 503);
  }
};

export const PATCH = update;
export const DELETE = update;

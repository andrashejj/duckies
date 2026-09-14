import type { APIRoute } from "astro";
import { getMemberSession } from "../../../lib/server/auth";
import { getDatabase } from "../../../lib/server/db";
import { json, parseName, sameOrigin } from "../../../lib/server/http";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const member = await getMemberSession(request.headers);
    if (!member) return json({ error: "Please sign in with a club-approved email address." }, 401);
    const { rows: kids } = await getDatabase().query("SELECT id, name FROM club_kid ORDER BY lower(name), id");
    return json({ member: { email: member.email, role: member.role }, kids });
  } catch {
    console.error("Duckies roster read failed. Check database configuration and migrations.");
    return json({ error: "The kids list is temporarily unavailable. Please try again." }, 503);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const member = await getMemberSession(request.headers);
    if (!member) return json({ error: "Please sign in." }, 401);
    if (member.role !== "organiser" || !sameOrigin(request)) return json({ error: "Organiser access required." }, 403);
    const body = await request.json().catch(() => null);
    const name = parseName(body?.name);
    if (!name) return json({ error: "Enter a name between 1 and 80 characters." }, 400);
    const { rows } = await getDatabase().query(
      "INSERT INTO club_kid (name, created_by) VALUES ($1, $2) RETURNING id, name", [name, member.userId],
    );
    return json({ kid: rows[0] }, 201);
  } catch {
    console.error("Duckies roster write failed.");
    return json({ error: "Couldn't save this duckie. Please try again." }, 503);
  }
};

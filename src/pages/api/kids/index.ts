import type { APIRoute } from "astro";
import { getMemberSession } from "../../../lib/server/auth";
import { getDatabase } from "../../../lib/server/db";
import { json, parseName, sameOrigin } from "../../../lib/server/http";

import { organiserRoster, RegistrationError } from "../../../lib/registration/records";
import { canManagePayments } from "../../../lib/registration/schema";
import { getSemester, semesters } from "../../../lib/registration/semesters";

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const member = await getMemberSession(request.headers);
    if (!member) return json({ error: "Please sign in with a club-approved email address." }, 401);
    const term = await getSemester(member.role === "organiser" ? url.searchParams.get("term") : undefined);
    const kids = member.role === "organiser" ? await organiserRoster(term.id) : (await getDatabase().query("SELECT id, name FROM club_kid WHERE archived_at IS NULL ORDER BY lower(name), id")).rows;
    return json({ member: { email: member.email, role: member.role, canManagePayments: member.role === "organiser" && canManagePayments(member.email) }, termLabel: term.label, term, semesters: member.role === "organiser" ? await semesters() : [], kids });
  } catch (error) {
    if (error instanceof RegistrationError) return json({ error: error.message }, error.status);
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

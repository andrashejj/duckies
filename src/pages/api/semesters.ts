import {
  safeRoute,
  requireOrganiser,
  readBody,
} from "../../lib/registration/http";
import {
  semesterSchema,
  semesters,
  getSemester,
  termId,
} from "../../lib/registration/semesters";
import { canManagePayments } from "../../lib/registration/schema";
import { RegistrationError } from "../../lib/registration/records";
import { getDatabase } from "../../lib/server/db";
import { json } from "../../lib/server/http";
export const prerender = false;
export const GET = safeRoute(async ({ request }) => {
  await requireOrganiser(request);
  return json({ semesters: await semesters() });
});
export const POST = safeRoute(async ({ request }) => {
  const member = await requireOrganiser(request, true);
  if (!canManagePayments(member.email))
    throw new RegistrationError("Only Andras can manage semesters.", 403);
  const parsed = semesterSchema.safeParse(await readBody(request));
  if (!parsed.success)
    throw new RegistrationError(
      "Enter a unique semester ID, label, valid dates and fees.",
    );
  const s = parsed.data;
  const result = await getDatabase().query(
    `INSERT INTO club_semester (id,label,starts_on,ends_on,child_fee_mur,family_fee_mur) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [s.id, s.label, s.startsOn, s.endsOn, s.childFeeMur, s.familyFeeMur],
  );
  if (!result.rowCount)
    throw new RegistrationError("That semester ID already exists.", 409);
  return json({ semesters: await semesters() }, 201);
});
export const PATCH = safeRoute(async ({ request }) => {
  const member = await requireOrganiser(request, true);
  if (!canManagePayments(member.email))
    throw new RegistrationError("Only Andras can manage semesters.", 403);
  const parsed = termId.safeParse((await readBody(request)).id);
  if (!parsed.success)
    throw new RegistrationError("Choose an existing semester.");
  await getSemester(parsed.data);
  const db = await getDatabase().connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(94831723)");
    await db.query(
      "UPDATE club_semester SET is_current=false WHERE is_current",
    );
    await db.query("UPDATE club_semester SET is_current=true WHERE id=$1", [
      parsed.data,
    ]);
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
  return json({ semesters: await semesters() });
});

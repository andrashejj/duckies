import { getDatabase } from "./db";
import { requireSignedIn } from "../registration/http";
import { RegistrationError } from "../registration/records";
import { readParentProfiles } from "./parent-profiles";
import { canCallRoll, type Coach, type TrainingAccess } from "../club-points";

// Every club member sees training; organisers and the coaches and trainers
// they select call the roll. Access is read on every request, so removing a
// coach takes effect straight away.
export async function trainingAccess(email: string): Promise<TrainingAccess | null> {
  const { rows } = await getDatabase().query<{ role: string | null; coach: boolean }>(
    `SELECT (SELECT role FROM club_member WHERE email=$1) AS role,EXISTS(SELECT 1 FROM club_coach WHERE email=$1) AS coach`, [email.trim().toLowerCase()]);
  return rows[0].role === "organiser" ? "organiser" : rows[0].coach ? "coach" : rows[0].role ? "member" : null;
}
export async function isCoach(email: string) {
  return !!(await getDatabase().query("SELECT 1 FROM club_coach WHERE email=$1", [email.trim().toLowerCase()])).rowCount;
}
export async function requireTrainingViewer(request: Request, mutation = false) {
  const actor = await requireSignedIn(request, mutation);
  const access = await trainingAccess(actor.email);
  if (!access) throw new RegistrationError("Training is for club members.", 403);
  return { ...actor, access };
}
export async function requireRollCaller(request: Request, mutation = false) {
  const viewer = await requireTrainingViewer(request, mutation);
  if (!canCallRoll(viewer.access)) throw new RegistrationError("Ask an organiser to add you as a coach to call the roll.", 403);
  return viewer;
}
export async function readCoaches(): Promise<Coach[]> {
  const { rows } = await getDatabase().query(`SELECT c.email,c.name,c.created_at,c.created_by,COALESCE(bool_or(u."emailVerified"),false) AS signed_in
    FROM club_coach c LEFT JOIN "user" u ON lower(u.email)=c.email GROUP BY c.email ORDER BY lower(c.name),c.email`);
  return rows.map(row => ({ email: row.email, name: row.name, addedAt: row.created_at.toISOString(), addedBy: row.created_by, signedIn: row.signed_in }));
}
/** A name is only needed for someone new: a parent or volunteer brings the one on their profile. */
export async function addCoach(email: string, name: string | undefined, actor: string) {
  email = email.trim().toLowerCase();
  const known = name?.trim() || (await readParentProfiles(email))[0]?.name.trim();
  if (!known) throw new RegistrationError("Add the coach’s name so the club knows who called the roll.");
  await getDatabase().query(`INSERT INTO club_coach(email,name,created_by) VALUES($1,$2,$3)
    ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name`, [email, known, actor]);
}
export async function removeCoach(email: string) {
  const { rowCount } = await getDatabase().query("DELETE FROM club_coach WHERE email=$1", [email.trim().toLowerCase()]);
  if (!rowCount) throw new RegistrationError("Coach not found.", 404);
}

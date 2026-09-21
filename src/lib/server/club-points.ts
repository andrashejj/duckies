import { getDatabase } from "./db";
import { RegistrationError } from "../registration/records";
import { PAYMENT_OWNER } from "../registration/schema";
import { clubToday, emptyPoints, type KidPoints, type PointRules, type TrainingBoard, type PointActivity } from "../club-points";

export const POINTS_OWNER = PAYMENT_OWNER;
export const canManagePoints = (email: string) => email.trim().toLowerCase() === POINTS_OWNER;
export async function pointRules(): Promise<PointRules> {
  return (await getDatabase().query("SELECT training,granola,cup FROM club_point_rule ORDER BY effective_at DESC,id DESC LIMIT 1")).rows[0];
}
export async function pointsForKids(ids: string[]): Promise<Map<string, KidPoints>> {
  const result = new Map(ids.map(id => [id, emptyPoints()]));
  if (!ids.length) return result;
  const { rows } = await getDatabase().query(`SELECT kid_id,kind,source_id AS "sourceId",activity_date AS date,points,units
    FROM club_point_activity WHERE kid_id=ANY($1::uuid[]) ORDER BY activity_date DESC,kind,source_id`, [ids]);
  for (const row of rows) {
    const entry = result.get(row.kid_id)!;
    const activity: PointActivity = { kind: row.kind, sourceId: row.sourceId, date: row.date, points: row.points, units: row.units };
    entry.total += activity.points; entry[activity.kind] += activity.points; entry.activities.push(activity);
  }
  return result;
}
export async function trainingBoard(date: string, email: string): Promise<TrainingBoard> {
  const db = getDatabase();
  const [kids, sessions, session, rules] = await Promise.all([
    db.query(`SELECT k.id,k.name,(SELECT updated_at FROM club_kid_photo WHERE kid_id=k.id) AS "photoVersion",COALESCE(a.present,false) AS present,
      COALESCE((SELECT string_agg(COALESCE(p.name,g.name),', ' ORDER BY g.email) FROM club_current_guardian g LEFT JOIN club_parent_profile p ON p.email=g.email WHERE g.kid_id=k.id),'') AS guardians
      FROM club_kid k LEFT JOIN club_attendance a ON a.kid_id=k.id AND a.date=$1::date
      WHERE k.archived_at IS NULL ORDER BY lower(k.name),k.id`, [date]),
    db.query(`SELECT t.date::text,count(a.kid_id) FILTER (WHERE a.present)::int AS present FROM club_training t LEFT JOIN club_attendance a ON a.date=t.date GROUP BY t.date ORDER BY t.date DESC LIMIT 60`),
    db.query("SELECT points FROM club_training WHERE date=$1::date", [date]), pointRules(),
  ]);
  const points = await pointsForKids(kids.rows.map(kid => kid.id));
  return { date, today: clubToday(), canEdit: canManagePoints(email), rules, sessionPoints: session.rows[0]?.points ?? rules.training,
    kids: kids.rows.map(kid => ({ ...kid, photoVersion: kid.photoVersion?.toISOString() ?? null, points: points.get(kid.id)! })), sessions: sessions.rows };
}
export async function markAttendance(date: string, kidId: string, present: boolean, actor: string) {
  if (!canManagePoints(actor)) throw new RegistrationError("Only Andras can record training attendance.", 403);
  if (date > clubToday()) throw new RegistrationError("Choose today or a past training date.");
  const db = await getDatabase().connect();
  try {
    await db.query("BEGIN");
    // The child lock serializes retry/undo requests; a single row represents a
    // child's attendance at a training, regardless of the number of clicks.
    const kid = await db.query("SELECT id FROM club_kid WHERE id=$1 AND archived_at IS NULL FOR UPDATE", [kidId]);
    if (!kid.rowCount) throw new RegistrationError("Duckie not found.", 404);
    await db.query(`INSERT INTO club_training(date,points,created_by) SELECT $1::date,training,$2 FROM club_point_rule ORDER BY effective_at DESC,id DESC LIMIT 1 ON CONFLICT(date) DO NOTHING`, [date,actor]);
    const saved = await db.query(`INSERT INTO club_attendance(date,kid_id,present,updated_by) VALUES($1::date,$2,$3,$4)
      ON CONFLICT(date,kid_id) DO UPDATE SET present=EXCLUDED.present,updated_by=EXCLUDED.updated_by,updated_at=clock_timestamp()
      WHERE club_attendance.present IS DISTINCT FROM EXCLUDED.present RETURNING kid_id`, [date,kidId,present,actor]);
    if (saved.rowCount) await db.query("INSERT INTO club_attendance_event(date,kid_id,present,recorded_by) VALUES($1::date,$2,$3,$4)", [date,kidId,present,actor]);
    await db.query("COMMIT");
  } catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); }
}
export async function savePointRules(rules: PointRules, actor: string) {
  if (!canManagePoints(actor)) throw new RegistrationError("Only Andras can change point values.", 403);
  await getDatabase().query("INSERT INTO club_point_rule(training,granola,cup,recorded_by) VALUES($1,$2,$3,$4)", [rules.training,rules.granola,rules.cup,actor]);
}

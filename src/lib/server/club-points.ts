import { getDatabase } from "./db";
import { RegistrationError } from "../registration/records";
import { PAYMENT_OWNER } from "../registration/schema";
import { trainingAccess } from "./coaches";
import { canCallRoll, clubToday, emptyPoints, type KidPoints, type PointActivity, type PointRules, type PointSplit, type SessionType, type TrainingAccess, type TrainingBoard } from "../club-points";

export const POINTS_OWNER = PAYMENT_OWNER;
export const canManagePoints = (email: string) => email.trim().toLowerCase() === POINTS_OWNER;
export async function pointRules(): Promise<PointRules> {
  return (await getDatabase().query("SELECT training,sunrise,granola,cup FROM club_point_rule ORDER BY effective_at DESC,id DESC LIMIT 1")).rows[0];
}
export async function pointsForKids(ids: string[]): Promise<Map<string, KidPoints>> {
  const result = new Map(ids.map(id => [id, emptyPoints()]));
  if (!ids.length) return result;
  const { rows } = await getDatabase().query(`SELECT kid_id,kind,session_type AS "sessionType",source_id AS "sourceId",activity_date AS date,points,units
    FROM club_point_activity WHERE kid_id=ANY($1::uuid[]) ORDER BY activity_date DESC,kind,source_id`, [ids]);
  for (const row of rows) {
    const entry = result.get(row.kid_id)!;
    const activity: PointActivity = { kind: row.kind, sessionType: row.sessionType, sourceId: row.sourceId, date: row.date, points: row.points, units: row.units };
    entry.total += activity.points; entry[activity.kind] += activity.points; entry.activities.push(activity);
  }
  return result;
}
export async function trainingBoard(date: string, sessionType: SessionType, email: string, access: TrainingAccess): Promise<TrainingBoard> {
  const db = getDatabase();
  const [kids, sessions, session, rules] = await Promise.all([
    db.query(`SELECT k.id,k.name,ph.updated_at AS "photoVersion",EXISTS(SELECT 1 FROM club_current_guardian g WHERE g.kid_id=k.id AND g.email=$2) AS mine,
      CASE a.present WHEN true THEN 'here' WHEN false THEN 'away' END AS status,COALESCE(t.trainings,0) AS trainings,
      COALESCE((SELECT string_agg(COALESCE(p.name,g.name),', ' ORDER BY g.email) FROM club_current_guardian g LEFT JOIN club_parent_profile p ON p.email=g.email WHERE g.kid_id=k.id),'') AS guardians
      FROM club_kid k LEFT JOIN club_kid_photo ph ON ph.kid_id=k.id LEFT JOIN club_attendance a ON a.kid_id=k.id AND a.date=$1::date AND a.session_type=$3
      LEFT JOIN (SELECT kid_id,count(*)::int AS trainings FROM club_attendance WHERE present GROUP BY kid_id) t ON t.kid_id=k.id
      WHERE k.archived_at IS NULL ORDER BY lower(k.name),k.id`, [date, email.trim().toLowerCase(), sessionType]),
    db.query(`SELECT t.date::text,count(a.kid_id) FILTER (WHERE a.present)::int AS present FROM club_training t LEFT JOIN club_attendance a ON a.date=t.date AND a.session_type=t.session_type WHERE t.session_type=$1 GROUP BY t.date ORDER BY t.date DESC LIMIT 60`, [sessionType]),
    db.query("SELECT points FROM club_training WHERE date=$1::date AND session_type=$2", [date, sessionType]), pointRules(),
  ]);
  const splits = await pointSplits(kids.rows.map(kid => kid.id));
  // Callers need every face and parent to call the roll; members see their own
  // duckies' portraits only, as elsewhere in the club.
  const caller = canCallRoll(access);
  return { date, sessionType, today: clubToday(), access, sessionPoints: session.rows[0]?.points ?? (sessionType === "sunrise" ? rules.sunrise : rules.training), sessions: sessions.rows,
    kids: kids.rows.map(kid => {
      const split = splits.get(kid.id)!;
      return { id: kid.id, name: kid.name, mine: kid.mine, status: kid.status, trainings: kid.trainings,
        guardians: caller ? kid.guardians : "", photoVersion: caller || kid.mine ? kid.photoVersion?.toISOString() ?? null : null,
        points: split.training + split.granola + split.cup, split: access === "organiser" ? split : null };
    }) };
}
async function pointSplits(ids: string[]): Promise<Map<string, PointSplit>> {
  const result = new Map(ids.map(id => [id, { training: 0, granola: 0, cup: 0 }]));
  if (!ids.length) return result;
  const { rows } = await getDatabase().query<{ kid_id: string; kind: keyof PointSplit; points: number }>(
    "SELECT kid_id,kind,sum(points)::int AS points FROM club_point_activity WHERE kid_id=ANY($1::uuid[]) GROUP BY kid_id,kind", [ids]);
  for (const row of rows) result.get(row.kid_id)![row.kind] = row.points;
  return result;
}
/** Organisers and coaches call the roll; each duckie there earns the session's points. */
export async function markAttendance(date: string, sessionType: SessionType, kidIds: string[], present: boolean, actor: string) {
  const access = await trainingAccess(actor);
  if (!access || !canCallRoll(access)) throw new RegistrationError("Ask an organiser to add you as a coach to call the roll.", 403);
  if (date > clubToday()) throw new RegistrationError("Choose today or a past training date.");
  const ids = [...new Set(kidIds)].sort();
  const db = await getDatabase().connect();
  try {
    await db.query("BEGIN");
    // The child locks (taken in id order) serialize retry/undo requests; a single
    // row represents a child's attendance at a training, however many taps.
    const kids = await db.query("SELECT id FROM club_kid WHERE id=ANY($1::uuid[]) AND archived_at IS NULL ORDER BY id FOR UPDATE", [ids]);
    if (kids.rowCount !== ids.length) throw new RegistrationError(ids.length === 1 ? "Duckie not found." : "Some of these duckies have left the club. Reload the roll.", 404);
    await db.query(`INSERT INTO club_training(date,session_type,points,created_by) SELECT $1::date,$2,CASE WHEN $2='sunrise' THEN sunrise ELSE training END,$3 FROM club_point_rule ORDER BY effective_at DESC,id DESC LIMIT 1 ON CONFLICT(date,session_type) DO NOTHING`, [date,sessionType,actor]);
    const saved = await db.query(`INSERT INTO club_attendance(date,session_type,kid_id,present,updated_by) SELECT $1::date,$2,id,$4,$5 FROM unnest($3::uuid[]) AS id
      ON CONFLICT(date,session_type,kid_id) DO UPDATE SET present=EXCLUDED.present,updated_by=EXCLUDED.updated_by,updated_at=clock_timestamp()
      WHERE club_attendance.present IS DISTINCT FROM EXCLUDED.present RETURNING kid_id`, [date,sessionType,ids,present,actor]);
    if (saved.rowCount) await db.query("INSERT INTO club_attendance_event(date,session_type,kid_id,present,recorded_by) SELECT $1::date,$2,id,$4,$5 FROM unnest($3::uuid[]) AS id", [date,sessionType,saved.rows.map(row => row.kid_id),present,actor]);
    await db.query("COMMIT");
  } catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); }
}
export async function savePointRules(rules: PointRules, actor: string) {
  if (!canManagePoints(actor)) throw new RegistrationError("Only Andras can change point values.", 403);
  await getDatabase().query("INSERT INTO club_point_rule(training,sunrise,granola,cup,recorded_by) VALUES($1,$2,$3,$4,$5)", [rules.training,rules.sunrise,rules.granola,rules.cup,actor]);
}

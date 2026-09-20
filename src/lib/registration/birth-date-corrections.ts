import { z } from "zod";
import { getDatabase } from "../server/db";

// The alias is supplied by our SQL, never from request input. Corrections are
// scoped to one signed record; a later guardian signature supersedes them.
export const correctedBirthDateSql = (waiver: string) =>
  `COALESCE((SELECT c.date_of_birth::text FROM club_birth_date_correction c WHERE c.waiver_id=${waiver}.id AND c.kid_id=${waiver}.kid_id ORDER BY c.recorded_at DESC, c.id DESC LIMIT 1), ${waiver}.snapshot->'registration'->>'dateOfBirth')`;

const correctionSchema = z.object({
  kidId: z.uuid(),
  expectedDate: z.iso.date(),
  dateOfBirth: z.iso.date().refine(value => {
    const earliest = new Date(); earliest.setUTCFullYear(earliest.getUTCFullYear() - 25);
    const date = new Date(`${value}T00:00:00Z`);
    return date <= new Date() && date >= earliest;
  }, "Enter a valid child's date of birth."),
  actorEmail: z.email().transform(value => value.toLowerCase()),
  reason: z.string().trim().min(1).max(1000),
}).strict();

// Local administrative command only. Dry-run by default, with the expected
// old date checked under the same kid lock used by guardian signing.
export async function correctBirthDate(raw: unknown, apply = false) {
  const data = correctionSchema.parse(raw);
  const db = await getDatabase().connect();
  try {
    await db.query("BEGIN");
    const actor = await db.query("SELECT 1 FROM club_member WHERE email=$1 AND role='organiser'", [data.actorEmail]);
    if (!actor.rowCount) throw new Error("A club organiser must authorise the correction.");
    const kid = await db.query("SELECT id,name FROM club_kid WHERE id=$1 AND archived_at IS NULL FOR UPDATE", [data.kidId]);
    if (!kid.rowCount) throw new Error("Active child not found.");
    const signed = await db.query(`SELECT w.id, ${correctedBirthDateSql("w")} AS dob FROM club_signed_waiver w WHERE kid_id=$1 ORDER BY signed_at DESC, id DESC LIMIT 1`, [data.kidId]);
    if (!signed.rowCount) throw new Error("No signed registration exists to correct.");
    const previous = signed.rows[0].dob;
    if (previous !== data.expectedDate && previous !== data.dateOfBirth) throw new Error("The birth date has changed. Recheck the record before correcting it.");
    const result = { kidId: data.kidId, name: kid.rows[0].name, previousDate: previous, dateOfBirth: data.dateOfBirth, changed: false };
    if (apply && previous !== data.dateOfBirth) {
      await db.query("INSERT INTO club_birth_date_correction(kid_id,waiver_id,previous_date,date_of_birth,reason,actor_email) VALUES ($1,$2,$3,$4,$5,$6)", [data.kidId,signed.rows[0].id,previous,data.dateOfBirth,data.reason,data.actorEmail]);
      result.changed = true;
    }
    await db.query(apply ? "COMMIT" : "ROLLBACK");
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally { db.release(); }
}

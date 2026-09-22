import { getDatabase } from "../server/db";
import { RegistrationError, grantGuardianMembership } from "./records";
import type { z } from "zod";
import { guardianSchema } from "./schema";
export type FamilyGuardian = z.infer<typeof guardianSchema> & { kidId: string; photoVersion: string | null };

export async function kidGuardians(kidIds: string[]): Promise<FamilyGuardian[]> {
  const { rows } = await getDatabase().query(`SELECT g.kid_id AS "kidId",g.email,
    COALESCE(p.name,g.name) AS name,COALESCE(p.phone,g.phone) AS phone,g.relationship,
    p.photo_updated_at AS "photoVersion"
    FROM club_current_guardian g LEFT JOIN club_parent_profile p ON p.email=g.email
    WHERE g.kid_id=ANY($1::uuid[]) ORDER BY g.kid_id,lower(COALESCE(p.name,g.name)),g.email`, [kidIds]);
  return rows.map(row => ({ ...row, photoVersion: row.photoVersion?.toISOString() ?? null }));
}

export async function changeGuardian(actor: string, kidIds: string[], guardian: z.infer<typeof guardianSchema> | { email: string }, remove = false) {
  if (remove && guardian.email === actor) throw new RegistrationError("You cannot remove your own family access here.");
  const db = await getDatabase().connect();
  try {
    await db.query("BEGIN");
    let added = false;
    // Serialize changes per child, then recheck permission after taking the lock.
    const kids = await db.query("SELECT id FROM club_kid WHERE id=ANY($1::uuid[]) AND archived_at IS NULL ORDER BY id FOR UPDATE", [kidIds]);
    if (kids.rowCount !== kidIds.length) throw new RegistrationError("Duckie not found.", 404);
    const admin = (await db.query("SELECT 1 FROM club_member WHERE email=$1 AND role='organiser'", [actor])).rowCount;
    for (const id of kidIds) {
      if (!admin && !(await db.query("SELECT 1 FROM club_current_guardian WHERE kid_id=$1 AND email=$2", [id, actor])).rowCount)
        throw new RegistrationError("That duckie is not in your family.", 404);
      const existing = await db.query("SELECT * FROM club_current_guardian WHERE kid_id=$1 AND email=$2", [id, guardian.email]);
      if (remove && !existing.rowCount) throw new RegistrationError("Guardian not found.", 404);
      if (!remove && !existing.rowCount && (await db.query("SELECT count(*)::int AS n FROM club_current_guardian WHERE kid_id=$1", [id])).rows[0].n >= 4)
        throw new RegistrationError("A duckie can have up to four legal guardians.");
      if (!remove && !existing.rowCount) added = true;
      const details = remove ? existing.rows[0] : guardian as z.infer<typeof guardianSchema>;
      await db.query(`INSERT INTO club_guardian_access(kid_id,email,name,relationship,phone,revoked_at,updated_by)
        VALUES($1,$2,$3,$4,$5,CASE WHEN $6 THEN now() ELSE NULL END,$7)
        ON CONFLICT(kid_id,email) DO UPDATE SET name=EXCLUDED.name,relationship=EXCLUDED.relationship,
        phone=EXCLUDED.phone,revoked_at=EXCLUDED.revoked_at,updated_by=EXCLUDED.updated_by,updated_at=now()`,
        [id,guardian.email,details.name,details.relationship,details.phone,remove,actor]);
    }
    // Club membership follows the family: a new guardian of a member kid joins,
    // and leaving the last shared duckie ends it (organisers are managed by hand).
    if (remove) await db.query("DELETE FROM club_member WHERE email=$1 AND role='member' AND NOT EXISTS(SELECT 1 FROM club_current_guardian WHERE email=$1)", [guardian.email]);
    else await grantGuardianMembership(db, kidIds);
    await db.query("COMMIT");
    return { added };
  } catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); }
}

export async function guardiansForActor(actor: string, kidIds: string[]) {
  const db = getDatabase();
  const admin = (await db.query("SELECT 1 FROM club_member WHERE email=$1 AND role='organiser'", [actor])).rowCount;
  const allowed = await db.query(`SELECT k.id FROM club_kid k WHERE k.id=ANY($1::uuid[]) AND k.archived_at IS NULL
    AND ($3::boolean OR EXISTS(SELECT 1 FROM club_current_guardian g WHERE g.kid_id=k.id AND g.email=$2))`, [kidIds, actor, !!admin]);
  if (allowed.rowCount !== kidIds.length) throw new RegistrationError("That duckie is not in your family.", 404);
  return kidGuardians(kidIds);
}

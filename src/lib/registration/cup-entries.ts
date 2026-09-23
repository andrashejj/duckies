import { getDatabase } from "../server/db";
import { CUP_TERM } from "./cup";
import { memberPaidSql, RegistrationError } from "./records";
import { getSemester } from "./semesters";

export type GuardianKid = {
  id: string;
  name: string;
  // Signed registration + current semester paid: surfs the cup for free.
  member: boolean;
  registered: boolean;
};

// Reuse only the signed-in guardian's contact details, from a current
// guardian relationship. Other adults on the same waiver stay private.
export async function guardianContact(email: string) {
  const { rows } = await getDatabase().query(
    `SELECT COALESCE(p.name,g.name) AS "contactName",COALESCE(p.phone,g.phone) AS "contactPhone"
    FROM club_current_guardian g LEFT JOIN club_parent_profile p ON p.email=g.email
    WHERE g.email=$1 ORDER BY g.kid_id LIMIT 1`,
    [email],
  );
  return (rows[0] as { contactName: string; contactPhone: string } | undefined) ?? null;
}

// The kids a signed-in guardian may register: those whose latest signed
// registration lists their email. Nothing else about the roster is exposed.
export async function guardianKids(email: string): Promise<GuardianKid[]> {
  const semester = await getSemester();
  const { rows } = await getDatabase().query(
    `SELECT k.id, k.name, ${memberPaidSql("k.id", "$2")} AS member,
      EXISTS (SELECT 1 FROM club_cup_entry c WHERE c.kid_id=k.id AND c.edition=$3) AS registered
    FROM club_kid k JOIN LATERAL (SELECT snapshot->'registration' AS r FROM club_signed_waiver WHERE kid_id=k.id ORDER BY signed_at DESC LIMIT 1) w ON true
    WHERE k.archived_at IS NULL AND EXISTS (SELECT 1 FROM club_current_guardian g WHERE g.kid_id=k.id AND g.email=$1)
    ORDER BY lower(k.name), k.id`,
    [email, semester.id, CUP_TERM],
  );
  return rows;
}

// A guardian registers one of their kids: the waiver is on file, so the entry
// just records who is coming and how to reach the family.
export async function registerGuardianKid(email: string, kidId: string) {
  const kid = (await guardianKids(email)).find((k) => k.id === kidId);
  if (!kid) throw new RegistrationError("That kid is not on a club registration under this email.", 404);
  await getDatabase().query(
    `INSERT INTO club_cup_entry (kid_id, edition, member, plan, contact_name, contact_phone)
    SELECT $1, $2, true, 'club', COALESCE(p.name,g.name), COALESCE(p.phone,g.phone)
    FROM club_current_guardian g LEFT JOIN club_parent_profile p ON p.email=g.email
    WHERE g.kid_id=$1 AND g.email=$3
    ON CONFLICT (kid_id, edition) DO UPDATE SET member=true, plan='club', contact_name=EXCLUDED.contact_name, contact_phone=EXCLUDED.contact_phone`,
    [kidId, CUP_TERM, email],
  );
  return { status: kid.member ? "member" : "pending", kidName: kid.name } as const;
}

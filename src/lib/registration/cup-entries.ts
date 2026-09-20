import { getDatabase } from "../server/db";
import { CUP_TERM } from "./cup";
import { memberPaidSql, RegistrationError } from "./records";
import type { SignupInput } from "./schema";
import { getSemester } from "./semesters";
import { findOrCreateKid, formFor, hasSigned, openSemester, type Signup } from "./signup";

// A new family: the kid is created with a cup entry and the family continues
// to the registration form — the cup's own, or the semester's when they join
// the club at the same time (membership covers the Cup, so that is the one
// form they sign). A family whose kid already has a signed club registration
// is sent to sign in instead — no form needed.
export async function registerCupGuest(input: SignupInput, join = false): Promise<Signup> {
  const term = join ? (await openSemester()).id : CUP_TERM;
  const kid = await findOrCreateKid(input);
  if (kid.signed && !(await hasSigned(kid.id, CUP_TERM))) return { status: "member", kidName: kid.name };
  await getDatabase().query(
    "INSERT INTO club_cup_entry (kid_id, edition, member, contact_name, contact_phone) VALUES ($1,$2,false,$3,$4) ON CONFLICT (kid_id, edition) DO NOTHING",
    [kid.id, CUP_TERM, input.contactName, input.contactPhone],
  );
  return formFor(kid, term);
}

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
    `SELECT g->>'name' AS "contactName", g->>'phone' AS "contactPhone"
    FROM club_kid k JOIN LATERAL (
      SELECT snapshot->'registration' AS r, signed_at FROM club_signed_waiver
      WHERE kid_id=k.id ORDER BY signed_at DESC LIMIT 1
    ) w ON true, jsonb_array_elements(w.r->'guardians') g
    WHERE k.archived_at IS NULL AND lower(g->>'email')=$1
    ORDER BY w.signed_at DESC, k.id LIMIT 1`,
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
    WHERE k.archived_at IS NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(w.r->'guardians') g WHERE lower(g->>'email')=$1)
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
    `INSERT INTO club_cup_entry (kid_id, edition, member, contact_name, contact_phone)
    SELECT $1, $2, true, g->>'name', g->>'phone'
    FROM club_signed_waiver w, jsonb_array_elements(w.snapshot->'registration'->'guardians') g
    WHERE w.kid_id=$1 AND lower(g->>'email')=$3 ORDER BY w.signed_at DESC LIMIT 1
    ON CONFLICT (kid_id, edition) DO UPDATE SET member=true, contact_name=EXCLUDED.contact_name, contact_phone=EXCLUDED.contact_phone`,
    [kidId, CUP_TERM, email],
  );
  return { status: kid.member ? "member" : "pending", kidName: kid.name } as const;
}

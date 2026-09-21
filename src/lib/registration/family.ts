import { kidGuardians, type FamilyGuardian } from "./guardians";
import { getDatabase } from "../server/db";
import { CUP_TERM } from "./cup";
import { issueLink, memberPaidSql, RegistrationError } from "./records";
import { ageAt, type RegistrationInput } from "./schema";
import { getSemester, type Semester } from "./semesters";

// What a signed-in guardian sees and changes about their own family.
//
// A family is found the way the Cup finds it: the kids whose latest signed
// registration lists this email, or a guardian explicitly shares access. Nothing else on
// the roster is reachable from here, and the signed record itself is never
// edited in place — corrections are re-signed through a fresh private link.

// The club's own note and the organiser who recorded it stay internal; a
// family sees what was recorded against them and when.
export type FamilyPayment = {
  term: string;
  termLabel: string;
  status: string;
  amountMur: string | null;
  recordedAt: string;
};
export type FamilyWaiver = { id: string; term: string; termLabel: string; signedAt: string };
export type FamilyKid = {
  id: string;
  name: string;
  age: number | null;
  photoVersion: string | null;
  // The guardian's own copy of the signed registration, minus the drawn
  // signature strokes — the PDF is the record, not the page.
  registration: Omit<RegistrationInput, "signature"> | null;
  waiver: FamilyWaiver | null;
  // The current semester's payment, as the club last recorded it.
  payment: FamilyPayment | null;
  // Registered and the current semester paid: a duckie in good standing.
  member: boolean;
  // The private registration link the club has open for this kid, if any.
  invitation: { expiresAt: string; completedAt: string | null } | null;
  contactName: string | null;
  contactPhone: string | null;
  cup: { edition: string; member: boolean; createdAt: string } | null;
  history: { waivers: FamilyWaiver[]; payments: FamilyPayment[] };
};
export type FamilyProfile = {
  email: string;
  name: string;
  term: Semester;
  kids: FamilyKid[];
  guardians: FamilyGuardian[];
};

const kidColumns = `SELECT k.id, k.name, k.contact_name, k.contact_phone,
  (SELECT updated_at FROM club_kid_photo WHERE kid_id=k.id) AS photo_version,
  w.id AS waiver_id, w.term AS waiver_term, w.signed_at,
  (SELECT label FROM club_semester WHERE id=w.term) AS waiver_term_label,
  w.snapshot->'registration' AS registration,
  (SELECT json_build_object('term',p.term,'termLabel',(SELECT label FROM club_semester WHERE id=p.term),'status',p.status,'amountMur',p.amount_mur,'recordedAt',p.recorded_at)
    FROM club_payment_event p WHERE p.kid_id=k.id AND p.term=$2 ORDER BY p.recorded_at DESC, p.id DESC LIMIT 1) AS payment,
  (SELECT json_build_object('expiresAt',l.expires_at,'completedAt',l.completed_at)
    FROM club_registration_link l WHERE l.kid_id=k.id AND l.revoked_at IS NULL AND l.expires_at > now() ORDER BY l.created_at DESC LIMIT 1) AS invitation,
  (SELECT json_build_object('edition',c.edition,'member',c.member,'createdAt',c.created_at)
    FROM club_cup_entry c WHERE c.kid_id=k.id AND c.edition=$3 LIMIT 1) AS cup,
  ${memberPaidSql("k.id", "$2")} AS member_paid
  FROM club_kid k LEFT JOIN LATERAL (SELECT * FROM club_signed_waiver WHERE kid_id=k.id ORDER BY signed_at DESC LIMIT 1) w ON true
  WHERE k.archived_at IS NULL AND EXISTS (SELECT 1 FROM club_current_guardian g WHERE g.kid_id=k.id AND g.email=$1)`;

// The ids this email may act on. Everything that writes goes through here
// first, so a guessed uuid never reaches another family's duckie.
export async function familyKidIds(email: string): Promise<string[]> {
  const { rows } = await getDatabase().query(
    `SELECT kid_id AS id FROM club_current_guardian WHERE email=$1`,
    [email],
  );
  return rows.map((row) => row.id as string);
}
export async function requireFamilyKid(email: string, kidId: string) {
  if (!(await familyKidIds(email)).includes(kidId))
    throw new RegistrationError("That duckie is not on a club registration under this email.", 404);
  return kidId;
}

// Every record this family has signed and every payment the club recorded,
// newest first, so the page can show one kid's whole history at a glance.
async function familyHistory(kidIds: string[]) {
  const waivers = new Map<string, FamilyWaiver[]>();
  const payments = new Map<string, FamilyPayment[]>();
  if (!kidIds.length) return { waivers, payments };
  const db = getDatabase();
  const [signed, paid] = await Promise.all([
    db.query(
      `SELECT w.kid_id, w.id, w.term, COALESCE(s.label, w.term) AS term_label, w.signed_at
      FROM club_signed_waiver w LEFT JOIN club_semester s ON s.id=w.term
      WHERE w.kid_id = ANY($1::uuid[]) ORDER BY w.signed_at DESC, w.id`,
      [kidIds],
    ),
    db.query(
      `SELECT p.kid_id, p.term, COALESCE(s.label, p.term) AS term_label, p.status, p.amount_mur, p.recorded_at
      FROM club_payment_event p LEFT JOIN club_semester s ON s.id=p.term
      WHERE p.kid_id = ANY($1::uuid[]) ORDER BY p.recorded_at DESC, p.id`,
      [kidIds],
    ),
  ]);
  for (const row of signed.rows)
    waivers.set(row.kid_id, [
      ...(waivers.get(row.kid_id) ?? []),
      { id: row.id, term: row.term, termLabel: row.term_label, signedAt: row.signed_at },
    ]);
  for (const row of paid.rows)
    payments.set(row.kid_id, [
      ...(payments.get(row.kid_id) ?? []),
      { term: row.term, termLabel: row.term_label, status: row.status, amountMur: row.amount_mur, recordedAt: row.recorded_at },
    ]);
  return { waivers, payments };
}

export async function familyProfile(guardian: { email: string; name: string }): Promise<FamilyProfile> {
  const term = await getSemester();
  const { rows } = await getDatabase().query(
    `${kidColumns} ORDER BY lower(k.name), k.id`,
    [guardian.email, term.id, CUP_TERM],
  );
  const history = await familyHistory(rows.map((row) => row.id as string));
  return {
    email: guardian.email,
    name: guardian.name,
    guardians: await kidGuardians(rows.map(row => row.id)),
    term,
    kids: rows.map((row) => {
      const registration = row.registration as RegistrationInput | null;
      if (registration) delete (registration as Partial<RegistrationInput>).signature;
      return {
        id: row.id,
        name: row.name,
        age: registration ? ageAt(registration.dateOfBirth) : null,
        photoVersion: row.photo_version,
        registration,
        waiver: row.waiver_id
          ? { id: row.waiver_id, term: row.waiver_term, termLabel: row.waiver_term_label ?? row.waiver_term, signedAt: row.signed_at }
          : null,
        payment: row.payment,
        member: row.member_paid,
        invitation: row.invitation,
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        cup: row.cup,
        history: { waivers: history.waivers.get(row.id) ?? [], payments: history.payments.get(row.id) ?? [] },
      };
    }),
  };
}

// The name the club greets this guardian by. Their address is the identity
// and never changes here — a new address means a new sign-in.
export async function renameGuardian(userId: string, name: string) {
  await getDatabase().query(`WITH renamed AS (
    UPDATE "user" SET name=$1,"updatedAt"=now() WHERE id=$2 RETURNING lower(email) AS email
  ) UPDATE club_parent_profile SET name=$1,registration_link_id=NULL,updated_at=now() WHERE email IN (SELECT email FROM renamed)`, [name, userId]);
}

// The club's quick way to reach this family about this kid. Unlike the signed
// registration, it is a working note the family keeps current themselves.
export async function updateKidContact(
  email: string,
  kidId: string,
  contact: { contactName: string; contactPhone: string },
) {
  await requireFamilyKid(email, kidId);
  const { rowCount } = await getDatabase().query(
    "UPDATE club_kid SET contact_name=$1, contact_phone=$2 WHERE id=$3 AND archived_at IS NULL",
    [contact.contactName, contact.contactPhone, kidId],
  );
  if (!rowCount) throw new RegistrationError("Duckie not found.", 404);
}

// Signed details (a date of birth, a medical note, who the guardians are)
// are never edited in place: the family fills the form in again and signs it,
// and the club keeps both records. This issues that private link — to the
// address that signed in, for the current semester, for their own duckie.
export async function issueFamilyLink(email: string, userId: string, kidId: string) {
  await requireFamilyKid(email, kidId);
  const term = await getSemester();
  return { ...(await issueLink(kidId, userId, term.id)), term };
}

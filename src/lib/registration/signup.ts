import { getDatabase } from "../server/db";
import { issueLink, RegistrationError } from "./records";
import type { SignupInput } from "./schema";
import { getSemester } from "./semesters";

// Phone numbers arrive in every format a family types; the trailing digits
// survive "+230", spaces and dashes alike.
export const phoneTail = (column: string) => `right(regexp_replace(${column}, '\\D', '', 'g'), 7)`;
export const tail = (value: string) => value.replace(/\D/g, "").slice(-7);

export type Signup =
  | { status: "signed"; kidName: string }
  | { status: "member"; kidName: string }
  | { status: "form"; kidName: string; url: string; expiresAt: string };

// A family signing up from the public site. The same name + number sent twice
// finds the kid again instead of adding a second one.
export async function findOrCreateKid(input: SignupInput) {
  const db = getDatabase();
  const name = input.kidName.replace(/\s+/g, " ");
  const { rows } = await db.query(
    `SELECT k.id, EXISTS (SELECT 1 FROM club_signed_waiver WHERE kid_id=k.id) AS signed FROM club_kid k
    WHERE k.archived_at IS NULL AND lower(k.name)=lower($1)
      AND (${phoneTail("coalesce(k.contact_phone,'')")}=$2
        OR EXISTS (SELECT 1 FROM club_cup_entry c WHERE c.kid_id=k.id AND ${phoneTail("c.contact_phone")}=$2)
        OR EXISTS (SELECT 1 FROM club_signed_waiver w, jsonb_array_elements(w.snapshot->'registration'->'guardians') g WHERE w.kid_id=k.id AND ${phoneTail("g->>'phone'")}=$2))
    ORDER BY k.created_at, k.id LIMIT 1`,
    [name, tail(input.contactPhone)],
  );
  if (rows[0]) return { id: rows[0].id as string, name, signed: rows[0].signed as boolean };
  const inserted = await db.query(
    "INSERT INTO club_kid (name, contact_name, contact_phone) VALUES ($1,$2,$3) RETURNING id",
    [name, input.contactName, input.contactPhone],
  );
  return { id: inserted.rows[0].id as string, name, signed: false };
}

export async function hasSigned(kidId: string, term: string) {
  const { rowCount } = await getDatabase().query(
    "SELECT 1 FROM club_signed_waiver WHERE kid_id=$1 AND term=$2 LIMIT 1",
    [kidId, term],
  );
  return Boolean(rowCount);
}

// Join the club: the kid is created pending and the family goes straight to
// the registration form for the current semester. Payment follows.
export async function joinClub(input: SignupInput): Promise<Signup> {
  const semester = await getSemester();
  if (!semester.isCurrent)
    throw new RegistrationError("Registration is not open right now. Message the club on WhatsApp.", 503);
  const kid = await findOrCreateKid(input);
  if (await hasSigned(kid.id, semester.id)) return { status: "signed", kidName: kid.name };
  const link = await issueLink(kid.id, null, semester.id);
  return { status: "form", kidName: kid.name, url: link.url, expiresAt: link.expiresAt };
}

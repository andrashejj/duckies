import { getDatabase } from "../server/db";
import { CUP_TERM } from "./cup";
import { issueLink, RegistrationError } from "./records";
import type { CupEntryInput } from "./schema";

// Phone numbers arrive in every format a family types; the trailing digits
// survive "+230", spaces and dashes alike.
const phoneTail = (column: string) => `right(regexp_replace(${column}, '\\D', '', 'g'), 7)`;
const tail = (value: string) => value.replace(/\D/g, "").slice(-7);

export const NO_MATCH =
  "We couldn't find a signed club registration for that name + number. Check the spelling (the name used at the club) and use a guardian number from the registration — or pick “not a member yet” and we'll get you the form.";

export type CupEntryResult =
  | { status: "member"; kidName: string }
  | { status: "signed"; kidName: string }
  | { status: "form"; kidName: string; url: string; expiresAt: string };

// A member's family signed the club form already: the kid's name plus one of
// the numbers on that registration is enough to put them on the cup list.
async function matchMember(name: string, phone: string) {
  const { rows } = await getDatabase().query(
    `SELECT k.id, k.name FROM club_kid k
    JOIN LATERAL (SELECT snapshot->'registration' AS r FROM club_signed_waiver WHERE kid_id=k.id ORDER BY signed_at DESC LIMIT 1) w ON true
    WHERE k.archived_at IS NULL
      AND (lower(k.name)=lower($1) OR lower(w.r->>'childName')=lower($1))
      AND (
        EXISTS (SELECT 1 FROM jsonb_array_elements(w.r->'guardians') g WHERE ${phoneTail("g->>'phone'")}=$2)
        OR ${phoneTail("coalesce(w.r->>'emergencyPhone','')")}=$2
        OR ${phoneTail("coalesce(k.contact_phone,'')")}=$2
      )
    ORDER BY k.created_at, k.id LIMIT 1`,
    [name, tail(phone)],
  );
  return rows[0] as { id: string; name: string } | undefined;
}

export async function registerForCup(input: CupEntryInput): Promise<CupEntryResult> {
  const db = getDatabase();
  const name = input.kidName.replace(/\s+/g, " ");
  if (input.member) {
    const kid = await matchMember(name, input.contactPhone);
    if (!kid) throw new RegistrationError(NO_MATCH, 404);
    await db.query(
      `INSERT INTO club_cup_entry (kid_id, edition, member, contact_name, contact_phone) VALUES ($1,$2,true,$3,$4)
      ON CONFLICT (kid_id, edition) DO UPDATE SET contact_name=EXCLUDED.contact_name, contact_phone=EXCLUDED.contact_phone`,
      [kid.id, CUP_TERM, input.contactName, input.contactPhone],
    );
    return { status: "member", kidName: kid.name };
  }
  // The same family sending the form twice gets its entry back, not a second kid.
  const existing = await db.query(
    `SELECT k.id, EXISTS (SELECT 1 FROM club_signed_waiver WHERE kid_id=k.id AND term=$1) AS signed
    FROM club_cup_entry c JOIN club_kid k ON k.id=c.kid_id
    WHERE c.edition=$1 AND NOT c.member AND k.archived_at IS NULL AND lower(k.name)=lower($2) AND ${phoneTail("c.contact_phone")}=$3
    ORDER BY c.created_at DESC LIMIT 1`,
    [CUP_TERM, name, tail(input.contactPhone)],
  );
  if (existing.rows[0]?.signed) return { status: "signed", kidName: name };
  let kidId: string = existing.rows[0]?.id;
  if (!kidId) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "INSERT INTO club_kid (name, contact_name, contact_phone) VALUES ($1,$2,$3) RETURNING id",
        [name, input.contactName, input.contactPhone],
      );
      kidId = rows[0].id;
      await client.query(
        "INSERT INTO club_cup_entry (kid_id, edition, member, contact_name, contact_phone) VALUES ($1,$2,false,$3,$4)",
        [kidId, CUP_TERM, input.contactName, input.contactPhone],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  const link = await issueLink(kidId, null, CUP_TERM, { requirePayment: false });
  return { status: "form", kidName: name, url: link.url, expiresAt: link.expiresAt };
}

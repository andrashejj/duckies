import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  randomUUID,
  sign,
  verify,
} from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { getDatabase } from "../server/db";
import { correctedBirthDateSql } from "./birth-date-corrections";
import { waiver, WAIVER_VERSION } from "./policy";
import { ageAt, submissionSchema, type RegistrationInput, type RegistrationPlan } from "./schema";
import { getSemester, semesters } from "./semesters";
import { CUP_TERM, isCupTerm, type CupPayment } from "./cup";
import { waiverPdf, type SignedSnapshot } from "./pdf";
export const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
export class RegistrationError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function key() {
  const value = process.env.WAIVER_SIGNING_PRIVATE_KEY;
  if (!value)
    throw new RegistrationError(
      "Signing is temporarily unavailable. Please contact the club.",
      503,
    );
  const result = createPrivateKey({
    key: Buffer.from(value, "base64"),
    format: "der",
    type: "pkcs8",
  });
  if (result.asymmetricKeyType !== "ed25519")
    throw new Error("An Ed25519 waiver key is required.");
  return result;
}
// The latest payment event decides whether a semester (or the cup) is paid.
export async function isPaid(kidId: string, term: string) {
  const { rows } = await getDatabase().query(
    "SELECT status FROM club_payment_event WHERE kid_id=$1 AND term=$2 ORDER BY recorded_at DESC, id DESC LIMIT 1",
    [kidId, term],
  );
  return rows[0]?.status === "paid";
}
// Registration comes before payment: organisers issue links from the roster
// and guardians from their family page. The kid stays pending until Andras
// records the fee. Families starting from the public form get a draft instead.
export async function issueLink(
  kidId: string,
  userId: string | null,
  termId?: string,
) {
  const semester = await getSemester(termId);
  key(); // Never issue a link whose signature cannot be stored.
  const db = await getDatabase().connect();
  try {
    await db.query("BEGIN");
    const kid = await db.query(
      "SELECT id FROM club_kid WHERE id = $1 AND archived_at IS NULL FOR UPDATE",
      [kidId],
    );
    if (!kid.rowCount) throw new RegistrationError("Duckie not found.", 404);
    await db.query(
      "UPDATE club_registration_link SET revoked_at = now() WHERE kid_id = $1 AND term=$2 AND revoked_at IS NULL",
      [kidId, semester.id],
    );
    const token = randomBytes(32).toString("base64url");
    const { rows } = await db.query(
      "INSERT INTO club_registration_link (kid_id, token_hash, term, created_by, expires_at) VALUES ($1,$2,$3,$4, now() + interval '14 days') RETURNING expires_at",
      [kidId, sha256(token), semester.id, userId],
    );
    await db.query("COMMIT");
    return { url: linkUrl(token), expiresAt: rows[0].expires_at };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
const linkUrl = (token: string) =>
  `${new URL(process.env.BETTER_AUTH_URL!).origin}/register#token=${token}`;
// The public form: a link for no kid and no term yet. Photos stage against it
// while the family fills the form in; signing decides who and what it is for,
// so a family that walks away leaves nothing on the roster.
export async function startDraft() {
  key(); // Never open a form whose signature cannot be stored.
  const token = randomBytes(32).toString("base64url");
  const { rows } = await getDatabase().query(
    "INSERT INTO club_registration_link (token_hash, expires_at) VALUES ($1, now() + interval '14 days') RETURNING expires_at",
    [sha256(token)],
  );
  return { token, url: linkUrl(token), expiresAt: rows[0].expires_at };
}
export function bearer(request: Request) {
  const token =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new RegistrationError(
      "This link is invalid or has expired. Ask the club for a new one.",
      404,
    );
  return sha256(token);
}
export async function linkInfo(hash: string) {
  const { rows } = await getDatabase().query(
    `SELECT l.*, k.name, s.label AS term_label,s.child_fee_mur,s.family_fee_mur FROM club_registration_link l LEFT JOIN club_kid k ON k.id = l.kid_id LEFT JOIN club_semester s ON s.id=l.term
    WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now() AND (l.kid_id IS NULL OR k.archived_at IS NULL)`,
    [hash],
  );
  if (!rows[0])
    throw new RegistrationError(
      "This link is invalid or has expired. Ask the club for a new one.",
      404,
    );
  return rows[0];
}
// The records one signing produced, newest group first, in the order the
// guardian filled the children in.
export async function signedGroup(linkId: string) {
  const { rows } = await getDatabase().query(
    `SELECT w.id, w.kid_id, w.signing_group, w.snapshot->'registration' AS registration
    FROM club_signed_waiver w
    WHERE w.link_id=$1 AND w.signing_group=(
      SELECT signing_group FROM club_signed_waiver WHERE link_id=$1 ORDER BY signed_at DESC, id DESC LIMIT 1)
    ORDER BY w.child_index`,
    [linkId],
  );
  return rows;
}
// The term a draft signs for: the Cup, or the semester open right now.
async function draftTerm(plan: RegistrationPlan | undefined) {
  if (!plan)
    throw new RegistrationError("Choose club membership, the Cup, or both at the top of the form.");
  if (plan === "cup") return CUP_TERM;
  const current = (await semesters()).find((semester) => semester.isCurrent);
  if (!current)
    throw new RegistrationError("Club registration is not open right now. Message the club on WhatsApp.", 503);
  return current.id;
}
// Phone numbers arrive in every format a family types; the trailing digits
// survive "+230", spaces and dashes alike.
const phoneTail = (column: string) => `right(regexp_replace(${column}, '\\D', '', 'g'), 7)`;
// A kid already on the roster under this name — or the first name the club
// knows them by — reachable on one of the guardians' numbers.
async function rosterMatch(
  db: PoolClient,
  childName: string,
  guardians: { phone: string }[],
  taken: string[],
) {
  const tails = guardians.map((guardian) => guardian.phone.replace(/\D/g, "").slice(-7));
  const { rows } = await db.query(
    `SELECT k.id, EXISTS (SELECT 1 FROM club_signed_waiver WHERE kid_id=k.id) AS signed FROM club_kid k
    WHERE k.archived_at IS NULL AND NOT (k.id = ANY($3::uuid[]))
      AND (lower(k.name)=lower($1) OR left(lower($1), length(k.name)+1)=lower(k.name)||' ')
      AND (${phoneTail("coalesce(k.contact_phone,'')")}=ANY($2)
        OR EXISTS (SELECT 1 FROM club_cup_entry c WHERE c.kid_id=k.id AND ${phoneTail("c.contact_phone")}=ANY($2))
        OR EXISTS (SELECT 1 FROM club_signed_waiver w, jsonb_array_elements(w.snapshot->'registration'->'guardians') g WHERE w.kid_id=k.id AND ${phoneTail("g->>'phone'")}=ANY($2)))
    ORDER BY lower(k.name)=lower($1) DESC, k.created_at, k.id LIMIT 1
    FOR UPDATE OF k`,
    [childName.replace(/\s+/g, " "), tails, taken],
  );
  return (rows[0] as { id: string; signed: boolean } | undefined) ?? null;
}
export async function completeRegistration(
  hash: string,
  raw: unknown,
  evidence: { ip: string; userAgent: string },
) {
  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success)
    throw new RegistrationError(
      parsed.error.issues[0]?.message ?? "Check your registration details.",
    );
  const privateKey = key();
  const db = await getDatabase().connect();
  try {
    await db.query("BEGIN");
    // Same lock order as issuance and archiving; single-use is enforced in this transaction.
    const found = await db.query(
      "SELECT kid_id FROM club_registration_link WHERE token_hash = $1",
      [hash],
    );
    if (!found.rowCount)
      throw new RegistrationError("This link is invalid or has expired.", 404);
    const invited: string | null = found.rows[0].kid_id;
    const kid = invited
      ? await db.query(
          "SELECT id, contact_name, contact_phone FROM club_kid WHERE id=$1 AND archived_at IS NULL FOR UPDATE",
          [invited],
        )
      : null;
    if (kid && !kid.rowCount)
      throw new RegistrationError("This link is invalid or has expired.", 404);
    const links = await db.query(
      "SELECT * FROM club_registration_link WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > now() FOR UPDATE",
      [hash],
    );
    const link = links.rows[0];
    if (!link)
      throw new RegistrationError("This link is invalid or has expired.", 404);
    // Another tab signed this draft while we waited for the lock.
    if (link.kid_id !== invited)
      throw new RegistrationError(
        "This form has already been signed. Reload the page to edit the signed details.",
        409,
      );
    // A draft from the public form: the family's choice sets the term.
    const draft = !invited;
    const term: string = draft ? await draftTerm(parsed.data.plan) : link.term;
    // A completed link can only be re-signed as an explicit correction of the
    // signing it produced, so a replayed first submission still fails.
    const previous = await db.query(
      `SELECT id, kid_id, signing_group FROM club_signed_waiver WHERE link_id=$1 AND signing_group=(
        SELECT signing_group FROM club_signed_waiver WHERE link_id=$1 ORDER BY signed_at DESC, id DESC LIMIT 1)
      ORDER BY child_index
      FOR UPDATE`,
      [link.id],
    );
    const { supersedes, children, plan, ...shared } = parsed.data;
    if (link.completed_at && supersedes !== previous.rows[0]?.signing_group)
      throw new RegistrationError(
        "This form has already been signed. Reload the page to edit the signed details.",
        409,
      );
    if (!link.completed_at && supersedes)
      throw new RegistrationError("There is no signed record to correct yet.");
    // A correction re-signs for the same children — adding one is fine,
    // dropping a signed record is not. Only the club archives a duckie.
    const signedKids = previous.rows.map((row) => row.kid_id as string);
    const claimed = children.flatMap((child) => (child.kidId ? [child.kidId] : []));
    if (
      supersedes &&
      (claimed.some((id) => !signedKids.includes(id)) ||
        signedKids.some((id) => !claimed.includes(id)))
    )
      throw new RegistrationError(
        "Reload the page before correcting: this form covers a different set of children now.",
      );
    if (!supersedes && claimed.length)
      throw new RegistrationError("There is no signed record to correct yet.");
    // On an invitation the first block is the kid the club invited; further
    // children join the same family, on the same link and the same signature.
    const contactName = kid?.rows[0].contact_name ?? shared.guardians[0].name;
    const contactPhone = kid?.rows[0].contact_phone ?? shared.guardians[0].phone;
    const kidIds: string[] = [];
    for (const [index, child] of children.entries()) {
      if (child.kidId) {
        kidIds.push(child.kidId);
        continue;
      }
      if (index === 0 && invited && !supersedes) {
        // The club often knows a duckie by first name alone; the form is
        // where the full name arrives, so the roster takes it from the first
        // signature. A name the club typed itself stays the club's — those
        // are deliberately short — and so does one already carried by a
        // signed registration.
        await db.query(
          `UPDATE club_kid SET name=$2 WHERE id=$1 AND created_by IS NULL
          AND NOT EXISTS (SELECT 1 FROM club_signed_waiver WHERE kid_id=$1)`,
          [invited, child.childName],
        );
        kidIds.push(invited);
        continue;
      }
      // A family signing the public form may already be on the roster — the
      // club added them after a WhatsApp chat, or recorded their fee. Pick
      // that duckie up by name and a guardian's number instead of adding a
      // second one.
      const matched = draft ? await rosterMatch(db, child.childName, shared.guardians, kidIds) : null;
      if (matched?.signed) {
        // A duckie the family registered before — last semester, for the Cup
        // alone, or on a form of their own — comes along on a sibling's form.
        // A name and a number are not enough to re-sign a signed record: the
        // guardian signing must already be on it, and the public form never
        // adds a guardian to one (that happens signed in, on the family page),
        // so nobody gains access to a family by knowing who they are.
        const current = (
          await db.query("SELECT email FROM club_current_guardian WHERE kid_id=$1", [matched.id])
        ).rows.map((row) => row.email as string);
        if (!current.includes(shared.guardians[0].email))
          throw new RegistrationError(
            `${child.childName} is already registered with the club. Sign in with the guardian email on their registration to renew or correct it — or message the club on WhatsApp.`,
          );
        const added = shared.guardians.find((guardian) => !current.includes(guardian.email));
        if (added)
          throw new RegistrationError(
            `${child.childName} is already registered with the club, and ${added.name} is not on their registration yet. Sign in with the guardian email on it to add a guardian — or message the club on WhatsApp.`,
          );
        // The name a signed registration carries stays; see the invited case.
        kidIds.push(matched.id);
        continue;
      }
      if (matched) {
        await db.query("UPDATE club_kid SET name=$2 WHERE id=$1 AND created_by IS NULL", [matched.id, child.childName]);
        kidIds.push(matched.id);
        continue;
      }
      const added = await db.query(
        "INSERT INTO club_kid (name, contact_name, contact_phone) VALUES ($1,$2,$3) RETURNING id",
        [child.childName, contactName, contactPhone],
      );
      kidIds.push(added.rows[0].id as string);
    }
    const signedAt = new Date().toISOString();
    const signingGroup = randomUUID();
    const publicKey = createPublicKey(privateKey)
      .export({ format: "pem", type: "spki" })
      .toString();
    const written: { id: string; kidId: string }[] = [];
    for (const [index, child] of children.entries()) {
      const { kidId: _claimed, slot, ...childFields } = child;
      const registration = { ...shared, ...childFields };
      const photo = await db.query(
        `SELECT 1 FROM club_registration_photo WHERE link_id=$1 AND slot=$2
         UNION ALL SELECT 1 FROM club_kid_photo WHERE kid_id=$3`,
        [link.id, slot, kidIds[index]],
      );
      if (!photo.rowCount)
        throw new RegistrationError(`Add a profile photo for ${child.childName} before signing.`);
      // Membership is training, so a semester needs a rhythm; a cup entry has none.
      if (isCupTerm(term)) delete registration.sessionsPerWeek;
      else if (!registration.sessionsPerWeek)
        throw new RegistrationError(
          `Choose a training rhythm for ${child.childName}.`,
        );
      const snapshot: SignedSnapshot = {
        id: randomUUID(),
        kidId: kidIds[index],
        term,
        signedAt,
        version: WAIVER_VERSION,
        registration,
        policy: waiver,
        evidence: {
          method: draft ? "public-form-electronic-signature" : "private-link-electronic-signature",
          linkId: link.id,
          ...(supersedes ? { supersedes } : {}),
          issuedAt: link.created_at.toISOString(),
          ip: evidence.ip.slice(0, 100),
          userAgent: evidence.userAgent.slice(0, 500),
          // One signature, one family: the siblings it also covered.
          ...(children.length > 1
            ? {
                signingGroup,
                alsoSignedFor: children
                  .filter((_, other) => other !== index)
                  .map((other) => other.childName),
              }
            : {}),
        },
      };
      const canonical = JSON.stringify(snapshot);
      const payloadHash = sha256(canonical);
      const pdf = await waiverPdf(snapshot, payloadHash);
      const pdfHash = sha256(pdf);
      const seal = sign(
        null,
        Buffer.from(`${payloadHash}.${pdfHash}`),
        privateKey,
      ).toString("base64");
      await db.query(
        `INSERT INTO club_signed_waiver (id,kid_id,link_id,term,signing_group,child_index,signed_at,snapshot,canonical_payload,payload_sha256,pdf,pdf_sha256,seal,public_key)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          snapshot.id,
          kidIds[index],
          link.id,
          term,
          signingGroup,
          index,
          signedAt,
          snapshot,
          canonical,
          payloadHash,
          pdf,
          pdfHash,
          seal,
          publicKey,
        ],
      );
      // The photo the guardian staged against this child's block.
      await db.query(
        `INSERT INTO club_kid_photo(kid_id,image,source) SELECT $1,image,'guardian' FROM club_registration_photo WHERE link_id=$2 AND slot=$3
        ON CONFLICT(kid_id) DO UPDATE SET image=EXCLUDED.image,source='guardian',uploaded_by=NULL,updated_at=now()`,
        [kidIds[index], link.id, slot],
      );
      written.push({ id: snapshot.id, kidId: kidIds[index] });
    }
    // Profiles and staged photos are committed with the signed registration.
    // A bearer link cannot overwrite another family's or an authenticated adult's profile.
    for (const guardian of shared.guardians) {
      await db.query(`INSERT INTO club_parent_profile(email,name,phone,registration_link_id)
        VALUES($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE
        SET name=EXCLUDED.name,phone=EXCLUDED.phone,updated_at=now()
        WHERE club_parent_profile.registration_link_id=EXCLUDED.registration_link_id`,
        [guardian.email, guardian.name, guardian.phone, link.id]);
      await db.query(`UPDATE club_parent_profile p SET image=s.image,photo_updated_at=clock_timestamp(),photo_registration_link_id=$2
        FROM club_registration_parent_photo s WHERE p.email=$1 AND s.email=p.email AND s.link_id=$2
        AND (p.photo_registration_link_id=$2 OR (p.image IS NULL AND p.registration_link_id=$2))`,
        [guardian.email, link.id]);
    }
    await db.query("DELETE FROM club_registration_parent_photo WHERE link_id=$1", [link.id]);
    await grantGuardianMembership(db, kidIds);
    // Who comes to the Cup: every child on a Cup form or on a family's
    // "club + Cup" form, and a sibling signed alongside a duckie already on
    // the list. A family's own choice replaces what an earlier entry said.
    const cupPlan = isCupTerm(term)
      ? "cup"
      : draft
        ? plan === "both" ? "club" : null
        : (await db.query("SELECT 1 FROM club_cup_entry WHERE kid_id=$1 AND edition=$2", [invited, CUP_TERM])).rowCount
          ? "club"
          : null;
    if (cupPlan)
      await db.query(
        `INSERT INTO club_cup_entry (kid_id, edition, member, plan, contact_name, contact_phone)
        SELECT unnest($1::uuid[]), $2, false, $3, $4, $5
        ON CONFLICT (kid_id, edition) DO UPDATE SET plan=EXCLUDED.plan WHERE $6::boolean`,
        [kidIds, CUP_TERM, cupPlan, contactName, contactPhone, draft],
      );
    // A signed draft becomes an ordinary link for its first child, so
    // corrections, the download and the roster read it like any other.
    await db.query(
      "UPDATE club_registration_link SET completed_at=$1, kid_id=COALESCE(kid_id,$3), term=COALESCE(term,$4) WHERE id=$2",
      [signedAt, link.id, kidIds[0], term],
    );
    // Any other invitation still open for these children is answered now.
    await db.query(
      "UPDATE club_registration_link SET revoked_at=now() WHERE kid_id=ANY($1::uuid[]) AND term=$2 AND id<>$3 AND revoked_at IS NULL AND completed_at IS NULL",
      [kidIds, term, link.id],
    );
    await db.query("DELETE FROM club_registration_photo WHERE link_id=$1", [
      link.id,
    ]);
    await db.query("COMMIT");
    return { signedAt, id: signingGroup, children: written };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
export function checkedRecord(record: any) {
  if (
    sha256(record.pdf) !== record.pdf_sha256 ||
    sha256(record.canonical_payload) !== record.payload_sha256 ||
    !verify(
      null,
      Buffer.from(`${record.payload_sha256}.${record.pdf_sha256}`),
      record.public_key,
      Buffer.from(record.seal, "base64"),
    )
  ) {
    throw new RegistrationError(
      "This record failed its integrity check. Please contact the club.",
      503,
    );
  }
  return record;
}
export function auditRecord(record: any) {
  return {
    canonicalPayload: record.canonical_payload,
    payloadSha256: record.payload_sha256,
    pdfSha256: record.pdf_sha256,
    algorithm: "Ed25519",
    signedMessage: `${record.payload_sha256}.${record.pdf_sha256}`,
    signatureBase64: record.seal,
    publicKey: record.public_key,
  };
}
export type OrganiserKid = {
  id: string;
  name: string;
  registration: RegistrationInput | null;
  age: number | null;
  birthDateCorrection: { dateOfBirth: string; previousDate: string; actorEmail: string; reason: string; recordedAt: string } | null;
  waiverId: string | null;
  signedAt: string | null;
  payment: any;
  link: any;
  contactName: string | null;
  contactPhone: string | null;
  photoVersion: string | null;
  waiverTerm: string | null;
  // A member is a kid with a signed registration whose current semester is
  // paid; the roster carries the payment half regardless of the term shown.
  memberPaid: boolean;
  // Guardian emails (from the signed registration) that may sign in.
  approvedGuardians: string[];
  familyGuardians: RegistrationInput["guardians"];
  cup: {
    edition: string;
    member: boolean;
    // What the family asked for at sign-up: the Cup alone, or club membership.
    plan: "cup" | "club";
    payment: CupPayment;
    contactName: string;
    contactPhone: string;
    createdAt: string;
  } | null;
};
// The latest payment status a kid has on a term, or NULL if none is recorded.
const paymentStatusSql = (kid: string, term: string) =>
  `(SELECT status FROM club_payment_event WHERE kid_id=${kid} AND term=${term} ORDER BY recorded_at DESC, id DESC LIMIT 1)`;
// Membership, as one SQL predicate: a signed registration and the current
// semester settled — paid, or no payment needed. Shared by the roster and the
// cup so they never disagree.
export const memberPaidSql = (kid: string, currentTerm: string) =>
  `EXISTS (SELECT 1 FROM club_signed_waiver WHERE kid_id=${kid}) AND COALESCE(${paymentStatusSql(kid, currentTerm)} IN ('paid','waived'), false)`;
// A Cup entrant's fee as a CupPayment: paid if the current semester or the
// cup's own term is paid, waived if either is marked no payment needed, and
// pending otherwise — however the family entered.
export const cupPaymentSql = (kid: string, currentTerm: string) =>
  `(SELECT CASE WHEN 'paid' IN (s, c) THEN 'paid' WHEN 'waived' IN (s, c) THEN 'waived' ELSE 'pending' END
    FROM (SELECT ${paymentStatusSql(kid, currentTerm)} AS s, ${paymentStatusSql(kid, `'${CUP_TERM}'`)} AS c) p)`;
// A member kid's legal guardians are club members. Every write that can make
// that true (a signed registration, the fee recorded, a guardian added) syncs
// these kids' guardians; membership only ends by hand or with the last shared
// duckie (see changeGuardian). Signing alone is not enough: /register is public.
export async function grantGuardianMembership(db: Pool | PoolClient, kidIds: string[]) {
  await db.query(
    `INSERT INTO club_member (email, role) SELECT DISTINCT g.email, 'member' FROM club_current_guardian g
    WHERE g.kid_id=ANY($1::uuid[]) AND ${memberPaidSql("g.kid_id", "(SELECT id FROM club_semester WHERE is_current)")}
    ON CONFLICT (email) DO NOTHING`,
    [kidIds],
  );
}
export async function organiserRoster(term: string, currentTerm: string): Promise<OrganiserKid[]> {
  const { rows } = await getDatabase().query(
    `SELECT k.*, (SELECT updated_at FROM club_kid_photo WHERE kid_id=k.id) AS photo_version, w.term AS waiver_term, w.id AS waiver_id, w.signed_at, w.snapshot->'registration' AS registration, ${correctedBirthDateSql("w")} AS effective_dob,
    (SELECT json_build_object('dateOfBirth',c.date_of_birth,'previousDate',c.previous_date,'actorEmail',c.actor_email,'reason',c.reason,'recordedAt',c.recorded_at) FROM club_birth_date_correction c WHERE c.waiver_id=w.id AND c.kid_id=k.id ORDER BY c.recorded_at DESC,c.id DESC LIMIT 1) AS birth_date_correction,
    (SELECT json_build_object('status',p.status,'amountMur',p.amount_mur,'note',p.note,'recordedAt',p.recorded_at) FROM club_payment_event p WHERE p.kid_id=k.id AND p.term=$1 ORDER BY recorded_at DESC, id DESC LIMIT 1) AS payment,
    (SELECT json_build_object('expiresAt',l.expires_at,'completedAt',l.completed_at) FROM club_registration_link l WHERE l.kid_id=k.id AND l.revoked_at IS NULL AND l.term=$1 ORDER BY created_at DESC LIMIT 1) AS link,
    (SELECT json_build_object('edition',c.edition,'member',c.member,'plan',c.plan,'payment',${cupPaymentSql("k.id", "$2")},'contactName',c.contact_name,'contactPhone',c.contact_phone,'createdAt',c.created_at) FROM club_cup_entry c WHERE c.kid_id=k.id ORDER BY c.created_at DESC LIMIT 1) AS cup,
    ${memberPaidSql("k.id", "$2")} AS member_paid,
    COALESCE((SELECT json_agg(m.email) FROM club_current_guardian g JOIN club_member m ON m.email=g.email WHERE g.kid_id=k.id), '[]'::json) AS approved_guardians,
    COALESCE((SELECT json_agg(json_build_object('name',COALESCE(p.name,g.name),'email',g.email,'phone',COALESCE(p.phone,g.phone),'relationship',g.relationship)) FROM club_current_guardian g LEFT JOIN club_parent_profile p ON p.email=g.email WHERE g.kid_id=k.id), '[]'::json) AS family_guardians
    FROM club_kid k LEFT JOIN LATERAL (SELECT * FROM club_signed_waiver WHERE kid_id=k.id ORDER BY signed_at DESC LIMIT 1) w ON true
    WHERE k.archived_at IS NULL ORDER BY lower(k.name), k.id`,
    [term, currentTerm],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    registration: row.registration ? { ...row.registration, dateOfBirth: row.effective_dob } : null,
    age: row.effective_dob ? ageAt(row.effective_dob) : null,
    birthDateCorrection: row.birth_date_correction,
    waiverId: row.waiver_id,
    signedAt: row.signed_at,
    payment: row.payment,
    link: row.link,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    photoVersion: row.photo_version,
    waiverTerm: row.waiver_term,
    memberPaid: row.member_paid,
    approvedGuardians: row.approved_guardians,
    familyGuardians: row.family_guardians,
    cup: row.cup,
  }));
}

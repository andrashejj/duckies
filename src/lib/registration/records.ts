import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  randomUUID,
  sign,
  verify,
} from "node:crypto";
import { getDatabase } from "../server/db";
import { correctedBirthDateSql } from "./birth-date-corrections";
import { waiver, WAIVER_VERSION } from "./policy";
import { ageAt, submissionSchema, type RegistrationInput } from "./schema";
import { getSemester } from "./semesters";
import { isCupTerm } from "./cup";
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
// Registration comes before payment: organisers issue links from the roster,
// and the public join / cup forms issue their own (no user). The kid stays
// pending until Andras records the fee.
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
    return {
      url: `${new URL(process.env.BETTER_AUTH_URL!).origin}/register#token=${token}`,
      expiresAt: rows[0].expires_at,
    };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
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
    `SELECT l.*, k.name, s.label AS term_label,s.child_fee_mur,s.family_fee_mur FROM club_registration_link l JOIN club_kid k ON k.id = l.kid_id JOIN club_semester s ON s.id=l.term
    WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now() AND k.archived_at IS NULL`,
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
    const kid = await db.query(
      "SELECT id, contact_name, contact_phone FROM club_kid WHERE id=$1 AND archived_at IS NULL FOR UPDATE",
      [found.rows[0].kid_id],
    );
    if (!kid.rowCount)
      throw new RegistrationError("This link is invalid or has expired.", 404);
    const links = await db.query(
      "SELECT * FROM club_registration_link WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > now() FOR UPDATE",
      [hash],
    );
    const link = links.rows[0];
    if (!link)
      throw new RegistrationError("This link is invalid or has expired.", 404);
    // A completed link can only be re-signed as an explicit correction of the
    // signing it produced, so a replayed first submission still fails.
    const previous = await db.query(
      `SELECT id, kid_id, signing_group FROM club_signed_waiver WHERE link_id=$1 AND signing_group=(
        SELECT signing_group FROM club_signed_waiver WHERE link_id=$1 ORDER BY signed_at DESC, id DESC LIMIT 1)
      ORDER BY child_index
      FOR UPDATE`,
      [link.id],
    );
    const { supersedes, children, ...shared } = parsed.data;
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
    // The first block always belongs to the kid the club invited; further
    // children join the same family, on the same link and the same signature.
    const contactName = kid.rows[0].contact_name ?? shared.guardians[0].name;
    const contactPhone = kid.rows[0].contact_phone ?? shared.guardians[0].phone;
    const kidIds: string[] = [];
    for (const [index, child] of children.entries()) {
      if (child.kidId) {
        kidIds.push(child.kidId);
        continue;
      }
      if (index === 0 && !supersedes) {
        kidIds.push(link.kid_id);
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
      // Membership is training, so a semester needs a rhythm; a cup entry has none.
      if (isCupTerm(link.term)) delete registration.sessionsPerWeek;
      else if (!registration.sessionsPerWeek)
        throw new RegistrationError(
          `Choose a training rhythm for ${child.childName}.`,
        );
      const snapshot: SignedSnapshot = {
        id: randomUUID(),
        kidId: kidIds[index],
        term: link.term,
        signedAt,
        version: WAIVER_VERSION,
        registration,
        policy: waiver,
        evidence: {
          method: "private-link-electronic-signature",
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
          link.term,
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
    // A sibling added to a cup form comes to the cup too.
    if (isCupTerm(link.term))
      await db.query(
        `INSERT INTO club_cup_entry (kid_id, edition, member, contact_name, contact_phone)
        SELECT unnest($1::uuid[]), $2, false, $3, $4 ON CONFLICT (kid_id, edition) DO NOTHING`,
        [kidIds, link.term, contactName, contactPhone],
      );
    await db.query(
      "UPDATE club_registration_link SET completed_at=$1 WHERE id=$2",
      [signedAt, link.id],
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
  cup: {
    edition: string;
    member: boolean;
    contactName: string;
    contactPhone: string;
    createdAt: string;
  } | null;
};
// Membership, as one SQL predicate: a signed registration and the current
// semester paid. Shared by the roster and the cup so they never disagree.
export const memberPaidSql = (kid: string, currentTerm: string) =>
  `EXISTS (SELECT 1 FROM club_signed_waiver WHERE kid_id=${kid}) AND COALESCE((SELECT status='paid' FROM club_payment_event WHERE kid_id=${kid} AND term=${currentTerm} ORDER BY recorded_at DESC, id DESC LIMIT 1), false)`;
export async function organiserRoster(term: string, currentTerm: string): Promise<OrganiserKid[]> {
  const { rows } = await getDatabase().query(
    `SELECT k.*, (SELECT updated_at FROM club_kid_photo WHERE kid_id=k.id) AS photo_version, w.term AS waiver_term, w.id AS waiver_id, w.signed_at, w.snapshot->'registration' AS registration, ${correctedBirthDateSql("w")} AS effective_dob,
    (SELECT json_build_object('dateOfBirth',c.date_of_birth,'previousDate',c.previous_date,'actorEmail',c.actor_email,'reason',c.reason,'recordedAt',c.recorded_at) FROM club_birth_date_correction c WHERE c.waiver_id=w.id AND c.kid_id=k.id ORDER BY c.recorded_at DESC,c.id DESC LIMIT 1) AS birth_date_correction,
    (SELECT json_build_object('status',p.status,'amountMur',p.amount_mur,'note',p.note,'recordedAt',p.recorded_at) FROM club_payment_event p WHERE p.kid_id=k.id AND p.term=$1 ORDER BY recorded_at DESC, id DESC LIMIT 1) AS payment,
    (SELECT json_build_object('expiresAt',l.expires_at,'completedAt',l.completed_at) FROM club_registration_link l WHERE l.kid_id=k.id AND l.revoked_at IS NULL AND l.term=$1 ORDER BY created_at DESC LIMIT 1) AS link,
    (SELECT json_build_object('edition',c.edition,'member',c.member,'contactName',c.contact_name,'contactPhone',c.contact_phone,'createdAt',c.created_at) FROM club_cup_entry c WHERE c.kid_id=k.id ORDER BY c.created_at DESC LIMIT 1) AS cup,
    ${memberPaidSql("k.id", "$2")} AS member_paid,
    COALESCE((SELECT json_agg(m.email) FROM jsonb_array_elements(w.snapshot->'registration'->'guardians') g JOIN club_member m ON m.email=lower(g->>'email')), '[]'::json) AS approved_guardians
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
    cup: row.cup,
  }));
}

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
import { waiver, WAIVER_VERSION } from "./policy";
import { registrationSchema, type RegistrationInput } from "./schema";
import { getSemester } from "./semesters";
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
export async function issueLink(
  kidId: string,
  userId: string,
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
export async function completeRegistration(
  hash: string,
  raw: unknown,
  evidence: { ip: string; userAgent: string },
) {
  const parsed = registrationSchema.safeParse(raw);
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
      "SELECT id FROM club_kid WHERE id=$1 AND archived_at IS NULL FOR UPDATE",
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
    if (link.completed_at)
      throw new RegistrationError(
        "This form has already been signed. Download the saved copy or ask the club for a correction link.",
        409,
      );
    const snapshot: SignedSnapshot = {
      id: randomUUID(),
      kidId: link.kid_id,
      term: link.term,
      signedAt: new Date().toISOString(),
      version: WAIVER_VERSION,
      registration: parsed.data,
      policy: waiver,
      evidence: {
        method: "private-link-electronic-signature",
        linkId: link.id,
        issuedAt: link.created_at.toISOString(),
        ip: evidence.ip.slice(0, 100),
        userAgent: evidence.userAgent.slice(0, 500),
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
    const publicKey = createPublicKey(privateKey)
      .export({ format: "pem", type: "spki" })
      .toString();
    await db.query(
      `INSERT INTO club_signed_waiver (id,kid_id,link_id,term,signed_at,snapshot,canonical_payload,payload_sha256,pdf,pdf_sha256,seal,public_key)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        snapshot.id,
        link.kid_id,
        link.id,
        link.term,
        snapshot.signedAt,
        snapshot,
        canonical,
        payloadHash,
        pdf,
        pdfHash,
        seal,
        publicKey,
      ],
    );
    await db.query(
      "UPDATE club_registration_link SET completed_at=$1 WHERE id=$2",
      [snapshot.signedAt, link.id],
    );
    await db.query(
      `INSERT INTO club_kid_photo(kid_id,image,source) SELECT $1,image,'guardian' FROM club_registration_photo WHERE link_id=$2
      ON CONFLICT(kid_id) DO UPDATE SET image=EXCLUDED.image,source='guardian',uploaded_by=NULL,updated_at=now()`,
      [link.kid_id, link.id],
    );
    await db.query("DELETE FROM club_registration_photo WHERE link_id=$1", [
      link.id,
    ]);
    await db.query("COMMIT");
    return { signedAt: snapshot.signedAt, id: snapshot.id };
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
export function ageAt(dateOfBirth: string, today = new Date()) {
  const birth = new Date(dateOfBirth + "T00:00:00Z");
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() &&
      today.getUTCDate() < birth.getUTCDate())
  )
    age--;
  return age;
}
export type OrganiserKid = {
  id: string;
  name: string;
  registration: RegistrationInput | null;
  age: number | null;
  waiverId: string | null;
  signedAt: string | null;
  payment: any;
  link: any;
  contactName: string | null;
  contactPhone: string | null;
  photoVersion: string | null;
  waiverTerm: string | null;
};
export async function organiserRoster(term: string): Promise<OrganiserKid[]> {
  const { rows } = await getDatabase().query(
    `SELECT k.*, (SELECT updated_at FROM club_kid_photo WHERE kid_id=k.id) AS photo_version, w.term AS waiver_term, w.id AS waiver_id, w.signed_at, w.snapshot->'registration' AS registration,
    (SELECT json_build_object('status',p.status,'amountMur',p.amount_mur,'note',p.note,'recordedAt',p.recorded_at) FROM club_payment_event p WHERE p.kid_id=k.id AND p.term=$1 ORDER BY recorded_at DESC, id DESC LIMIT 1) AS payment,
    (SELECT json_build_object('expiresAt',l.expires_at,'completedAt',l.completed_at) FROM club_registration_link l WHERE l.kid_id=k.id AND l.revoked_at IS NULL AND l.term=$1 ORDER BY created_at DESC LIMIT 1) AS link
    FROM club_kid k LEFT JOIN LATERAL (SELECT * FROM club_signed_waiver WHERE kid_id=k.id ORDER BY signed_at DESC LIMIT 1) w ON true
    WHERE k.archived_at IS NULL ORDER BY lower(k.name), k.id`,
    [term],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    registration: row.registration,
    age: row.registration ? ageAt(row.registration.dateOfBirth) : null,
    waiverId: row.waiver_id,
    signedAt: row.signed_at,
    payment: row.payment,
    link: row.link,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    photoVersion: row.photo_version,
    waiverTerm: row.waiver_term,
  }));
}

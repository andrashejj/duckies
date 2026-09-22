import {
  bearer,
  completeRegistration,
  isPaid,
  linkInfo,
  RegistrationError,
} from "../../../lib/registration/records";
import {
  readBody,
  registrationRateLimit,
  safeRoute,
} from "../../../lib/registration/http";
import { CUP_TERM, isCupTerm } from "../../../lib/registration/cup";
import { correctedBirthDateSql } from "../../../lib/registration/birth-date-corrections";
import { MAX_CHILDREN } from "../../../lib/registration/schema";
import { getDatabase } from "../../../lib/server/db";
import { json, sameOrigin } from "../../../lib/server/http";
import {
  membershipCovers,
  RECOMMENDED_AGE,
  waiver,
  WAIVER_VERSION,
} from "../../../lib/registration/policy";
export const prerender = false;
export const GET = safeRoute(async ({ request, clientAddress }) => {
  await registrationRateLimit(clientAddress);
  const link = await linkInfo(bearer(request));
  // Only what this very link signed comes back for editing: a fresh link never
  // prefills from earlier records, so it cannot leak another guardian's details.
  // One signing covers the whole family, so all of its children come back.
  const { rows } = await getDatabase().query(
    `SELECT w.id, w.kid_id, w.signing_group, jsonb_set(w.snapshot->'registration', '{dateOfBirth}', to_jsonb(${correctedBirthDateSql("w")})) AS registration,
      EXISTS(SELECT 1 FROM club_kid_photo WHERE kid_id=w.kid_id) AS has_photo
    FROM club_signed_waiver w
    WHERE w.link_id=$1 AND w.signing_group=(
      SELECT signing_group FROM club_signed_waiver WHERE link_id=$1 ORDER BY signed_at DESC, id DESC LIMIT 1)
    ORDER BY w.child_index`,
    [link.id],
  );
  const signed = rows[0];
  const photo = await getDatabase().query("SELECT 1 FROM club_kid_photo WHERE kid_id=$1", [link.kid_id]);
  // Joining the club from the Cup page: membership covers the Cup, and the form says so.
  const cupEntry = await getDatabase().query("SELECT 1 FROM club_cup_entry WHERE kid_id=$1 AND edition=$2", [link.kid_id, CUP_TERM]);
  return json({
    childName: link.name,
    hasPhoto: Boolean(photo.rowCount),
    term: link.term,
    termLabel: link.term_label,
    cup: isCupTerm(link.term),
    cupIncluded: !isCupTerm(link.term) && Boolean(cupEntry.rowCount),
    // Registration comes first; the page says so unless the fee is already in.
    paid: await isPaid(link.kid_id, link.term),
    childFeeMur: Number(link.child_fee_mur),
    familyFeeMur: Number(link.family_fee_mur),
    expiresAt: link.expires_at,
    completedAt: link.completed_at,
    canDownload:
      link.completed_at &&
      Date.now() - new Date(link.completed_at).getTime() < 60 * 60 * 1000,
    signed: signed
      ? {
          // The signing to correct, and every child it covered.
          id: signed.signing_group,
          registration: signed.registration,
          children: rows.map((row) => ({
            kidId: row.kid_id,
            registration: row.registration,
            hasPhoto: row.has_photo,
          })),
        }
      : null,
    maxChildren: MAX_CHILDREN,
    version: WAIVER_VERSION,
    recommendedAge: RECOMMENDED_AGE,
    covers: membershipCovers,
    waiver,
  });
});
export const POST = safeRoute(async ({ request, clientAddress }) => {
  if (!sameOrigin(request))
    throw new RegistrationError("Invalid request origin.", 403);
  await registrationRateLimit(clientAddress);
  const result = await completeRegistration(
    bearer(request),
    await readBody(request),
    { ip: clientAddress, userAgent: request.headers.get("user-agent") ?? "" },
  );
  return json(result, 201);
});

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
import { getDatabase } from "../../../lib/server/db";
import { json, sameOrigin } from "../../../lib/server/http";
import {
  membershipCovers,
  MINIMUM_AGE,
  waiver,
  WAIVER_VERSION,
} from "../../../lib/registration/policy";
export const prerender = false;
export const GET = safeRoute(async ({ request, clientAddress }) => {
  await registrationRateLimit(clientAddress);
  const link = await linkInfo(bearer(request));
  // Only what this very link signed comes back for editing: a fresh link never
  // prefills from earlier records, so it cannot leak another guardian's details.
  const { rows } = await getDatabase().query(
    `SELECT w.id, w.snapshot->'registration' AS registration, EXISTS(SELECT 1 FROM club_kid_photo WHERE kid_id=w.kid_id) OR EXISTS(SELECT 1 FROM club_registration_photo WHERE link_id=w.link_id) AS has_photo
    FROM club_signed_waiver w WHERE w.link_id=$1 ORDER BY w.signed_at DESC LIMIT 1`,
    [link.id],
  );
  const signed = rows[0];
  // Joining the club from the Cup page: membership covers the Cup, and the form says so.
  const cupEntry = await getDatabase().query("SELECT 1 FROM club_cup_entry WHERE kid_id=$1 AND edition=$2", [link.kid_id, CUP_TERM]);
  return json({
    childName: link.name,
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
      ? { id: signed.id, registration: signed.registration, hasPhoto: signed.has_photo }
      : null,
    version: WAIVER_VERSION,
    minimumAge: MINIMUM_AGE,
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

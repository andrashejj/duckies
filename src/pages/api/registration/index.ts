import {
  bearer,
  completeRegistration,
  linkInfo,
  RegistrationError,
} from "../../../lib/registration/records";
import {
  readBody,
  registrationRateLimit,
  safeRoute,
} from "../../../lib/registration/http";
import { json, sameOrigin } from "../../../lib/server/http";
import {
  waiver,
  WAIVER_VERSION,
} from "../../../lib/registration/policy";
export const prerender = false;
export const GET = safeRoute(async ({ request, clientAddress }) => {
  await registrationRateLimit(clientAddress);
  const link = await linkInfo(bearer(request));
  return json({
    childName: link.name,
    term: link.term,
    termLabel: link.term_label,
    childFeeMur: Number(link.child_fee_mur),
    familyFeeMur: Number(link.family_fee_mur),
    expiresAt: link.expires_at,
    completedAt: link.completed_at,
    canDownload:
      link.completed_at &&
      Date.now() - new Date(link.completed_at).getTime() < 60 * 60 * 1000,
    version: WAIVER_VERSION,
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

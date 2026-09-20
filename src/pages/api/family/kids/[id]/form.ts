import { issueFamilyLink, requireFamilyKid } from "../../../../../lib/registration/family";
import {
  formLinkRateLimit,
  requireSignedIn,
  safeRoute,
} from "../../../../../lib/registration/http";
import { RegistrationError } from "../../../../../lib/registration/records";
import { uuid } from "../../../../../lib/registration/schema";
import { getDatabase } from "../../../../../lib/server/db";
import { sendMail } from "../../../../../lib/server/email";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// A guardian asks for their duckie's registration form again — to correct a
// date of birth, a medical note, a media choice, or to add a brother or
// sister. Signed records are never edited: the family fills the form in and
// signs it again, and the club keeps both. The link comes back on the page so
// it works even when mail is down, and by email so it is on hand later.
export const POST = safeRoute(async ({ request, params, clientAddress }) => {
  const { email, userId } = await requireSignedIn(request, true);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("That duckie is not on a club registration under this email.", 404);
  // Ownership first: a guessed uuid never spends anyone's budget but its own.
  await requireFamilyKid(email, params.id!);
  await formLinkRateLimit(clientAddress);
  const { url, expiresAt, term } = await issueFamilyLink(email, userId, params.id!);
  const { rows } = await getDatabase().query("SELECT name FROM club_kid WHERE id=$1", [params.id]);
  const kidName = rows[0]?.name ?? "your duckie";
  const expiry = new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Mauritius" });
  let emailed = true;
  try {
    await sendMail({
      to: email,
      subject: `${kidName}'s Sunset Duckies registration form`,
      text: `Here is ${kidName}'s registration form for ${term.label}:\n\n${url}\n\nNo login needed. Fill it in and sign — about five minutes. Your newest signed record is the one the club goes by, and the earlier one is kept with it.\n\nThis private link is only for ${kidName}'s legal guardians and expires on ${expiry}. If you didn't ask for it, you can ignore this email and message the club.\n\nSunset Duckies`,
    });
  } catch {
    emailed = false;
  }
  return json({ url, expiresAt, term: term.label, emailed }, 201);
});

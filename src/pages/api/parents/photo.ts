import { familyEmails } from "../../../lib/server/family-access";
import { registrationRateLimit, requireSignedIn, safeRoute } from "../../../lib/registration/http";
import { RegistrationError } from "../../../lib/registration/records";
import { readPhoto } from "../../../lib/registration/photos";
import { findMember, getDatabase } from "../../../lib/server/db";
import { readOwnProfile, readParentProfiles, saveParentProfile } from "../../../lib/server/parent-profiles";
import { json } from "../../../lib/server/http";
export const prerender = false;
async function access(request: Request, mutation = false) {
  const user = await requireSignedIn(request, mutation);
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() || user.email;
  if (email !== user.email && (await findMember(user.email))?.role !== "organiser" && (mutation || !(await familyEmails(user.email)).includes(email))) throw new RegistrationError("This photo is private.", 403);
  if (email !== user.email && !(await readParentProfiles(email)).length) throw new RegistrationError("Parent not found.", 404);
  return email;
}
export const GET = safeRoute(async ({ request }) => {
  const email = await access(request);
  const { rows } = await getDatabase().query("SELECT image FROM club_parent_profile WHERE email=$1", [email]);
  if (!rows[0]?.image) throw new RegistrationError("Photo not found.", 404);
  return new Response(new Uint8Array(rows[0].image), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store" } });
});
export const PUT = safeRoute(async ({ request, clientAddress }) => {
  const email = await access(request, true);
  await registrationRateLimit(clientAddress);
  const image = await readPhoto(request);
  const profile = await readOwnProfile(email);
  if (!profile.name) throw new RegistrationError("Save a name before adding a photo.");
  await saveParentProfile(email, profile);
  await getDatabase().query("UPDATE club_parent_profile SET image=$2,photo_registration_link_id=NULL,photo_updated_at=clock_timestamp() WHERE email=$1", [email, image]);
  return json(await readOwnProfile(email));
});
export const DELETE = safeRoute(async ({ request }) => {
  const email = await access(request, true);
  await getDatabase().query("UPDATE club_parent_profile SET image=NULL,photo_registration_link_id=NULL,photo_updated_at=NULL WHERE email=$1", [email]);
  return json(await readOwnProfile(email));
});

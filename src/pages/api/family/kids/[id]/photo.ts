import { requireFamilyKid } from "../../../../../lib/registration/family";
import {
  registrationRateLimit,
  requireSignedIn,
  safeRoute,
} from "../../../../../lib/registration/http";
import { readPhoto } from "../../../../../lib/registration/photos";
import { RegistrationError } from "../../../../../lib/registration/records";
import { uuid } from "../../../../../lib/registration/schema";
import { getDatabase } from "../../../../../lib/server/db";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

// One duckie's profile photo, for their own guardian. Same rules as the
// organiser's: re-encoded on the way in, private on the way out.
async function ownKid(request: Request, id: string | undefined, mutation = false) {
  const { email } = await requireSignedIn(request, mutation);
  if (!uuid.safeParse(id).success)
    throw new RegistrationError("That duckie is not on a club registration under this email.", 404);
  return requireFamilyKid(email, id!);
}

export const GET = safeRoute(async ({ request, params }) => {
  const kidId = await ownKid(request, params.id);
  const { rows } = await getDatabase().query(
    "SELECT image FROM club_kid_photo WHERE kid_id=$1",
    [kidId],
  );
  if (!rows[0]) throw new RegistrationError("Photo not found.", 404);
  return new Response(new Uint8Array(rows[0].image), {
    headers: { "Content-Type": "image/webp", "Content-Disposition": 'inline; filename="duckie.webp"' },
  });
});

export const PUT = safeRoute(async ({ request, params, clientAddress }) => {
  const kidId = await ownKid(request, params.id, true);
  await registrationRateLimit(clientAddress);
  const image = await readPhoto(request);
  await getDatabase().query(
    `INSERT INTO club_kid_photo(kid_id,image,source) VALUES($1,$2,'guardian')
    ON CONFLICT(kid_id) DO UPDATE SET image=EXCLUDED.image, source='guardian', uploaded_by=NULL, updated_at=now()`,
    [kidId, image],
  );
  return json({ success: true });
});

export const DELETE = safeRoute(async ({ request, params }) => {
  const kidId = await ownKid(request, params.id, true);
  await getDatabase().query("DELETE FROM club_kid_photo WHERE kid_id=$1", [kidId]);
  return json({ success: true });
});

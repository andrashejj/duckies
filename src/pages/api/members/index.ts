import { readBody, requireOrganiser, safeRoute } from "../../../lib/registration/http";
import { RegistrationError } from "../../../lib/registration/records";
import { emailSchema } from "../../../lib/registration/schema";
import { getDatabase } from "../../../lib/server/db";
import { json } from "../../../lib/server/http";
export const prerender = false;
// Guardians of a paid-up duckie become club members on their own (see
// grantGuardianMembership); this is the hand-operated door for everyone
// else, and for taking membership away. Family-only sign-in is scoped
// separately through current guardian relationships.
export const POST = safeRoute(async ({ request }) => {
  await requireOrganiser(request, true);
  const parsed = emailSchema.safeParse((await readBody(request))?.email);
  if (!parsed.success) throw new RegistrationError("Enter a valid email address.");
  await getDatabase().query(
    "INSERT INTO club_member (email, role) VALUES ($1, 'member') ON CONFLICT (email) DO NOTHING",
    [parsed.data],
  );
  return json({ email: parsed.data }, 201);
});
export const DELETE = safeRoute(async ({ request, url }) => {
  const organiser = await requireOrganiser(request, true);
  const parsed = emailSchema.safeParse(url.searchParams.get("email"));
  if (!parsed.success) throw new RegistrationError("Enter a valid email address.");
  if (parsed.data === organiser.email)
    throw new RegistrationError("You cannot revoke your own access here.");
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    const removed = await client.query(
      "DELETE FROM club_member WHERE email=$1 AND role='member'",
      [parsed.data],
    );
    if (!removed.rowCount)
      throw new RegistrationError("Only member access can be revoked here; organisers are managed from the command line.", 409);
    await client.query(
      'DELETE FROM "session" WHERE "userId" IN (SELECT id FROM "user" WHERE lower(email)=$1)',
      [parsed.data],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return json({ success: true });
});

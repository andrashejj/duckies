import { familyKidIds } from "../../../lib/registration/family";
import { requireSignedIn, safeRoute } from "../../../lib/registration/http";
import {
  checkedRecord,
  auditRecord,
  RegistrationError,
} from "../../../lib/registration/records";
import { uuid } from "../../../lib/registration/schema";
import { findMember, getDatabase } from "../../../lib/server/db";
import { json } from "../../../lib/server/http";
export const prerender = false;
// Organisers reach every signed record; a guardian reaches the records of the
// duckies currently registered under their email, and nothing else. Their
// lookup is scoped to their own kids, so another family's record and a record
// that does not exist answer the same way — neither confirms the other.
export const GET = safeRoute(async ({ request, params, url }) => {
  const { email } = await requireSignedIn(request);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("Record not found.", 404);
  const organiser = (await findMember(email))?.role === "organiser";
  const { rows } = organiser
    ? await getDatabase().query("SELECT * FROM club_signed_waiver WHERE id=$1", [params.id])
    : await getDatabase().query(
        "SELECT * FROM club_signed_waiver WHERE id=$1 AND kid_id = ANY($2::uuid[])",
        [params.id, await familyKidIds(email)],
      );
  if (!rows[0])
    throw organiser
      ? new RegistrationError("Record not found.", 404)
      : new RegistrationError("You do not have access to this record.", 403);
  const record = checkedRecord(rows[0]);
  if (url.searchParams.get("format") === "audit")
    return json(auditRecord(record));
  return new Response(new Uint8Array(record.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sunset-duckies-waiver-${record.id}.pdf"`,
    },
  });
});

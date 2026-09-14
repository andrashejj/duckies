import { requireOrganiser, safeRoute } from "../../../lib/registration/http";
import {
  checkedRecord,
  auditRecord,
  RegistrationError,
} from "../../../lib/registration/records";
import { uuid } from "../../../lib/registration/schema";
import { getDatabase } from "../../../lib/server/db";
import { json } from "../../../lib/server/http";
export const prerender = false;
export const GET = safeRoute(async ({ request, params, url }) => {
  await requireOrganiser(request);
  if (!uuid.safeParse(params.id).success)
    throw new RegistrationError("Record not found.", 404);
  const { rows } = await getDatabase().query(
    "SELECT * FROM club_signed_waiver WHERE id=$1",
    [params.id],
  );
  if (!rows[0]) throw new RegistrationError("Record not found.", 404);
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

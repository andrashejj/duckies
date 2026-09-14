import {
  bearer,
  checkedRecord,
  linkInfo,
  RegistrationError,
  auditRecord,
} from "../../../lib/registration/records";
import {
  registrationRateLimit,
  safeRoute,
} from "../../../lib/registration/http";
import { getDatabase } from "../../../lib/server/db";
import { json } from "../../../lib/server/http";
export const prerender = false;
export const GET = safeRoute(async ({ request, url, clientAddress }) => {
  await registrationRateLimit(clientAddress);
  const link = await linkInfo(bearer(request));
  if (
    !link.completed_at ||
    Date.now() - new Date(link.completed_at).getTime() > 60 * 60 * 1000
  )
    throw new RegistrationError(
      "The download window has closed. Ask the club for your saved copy.",
      410,
    );
  const { rows } = await getDatabase().query(
    "SELECT * FROM club_signed_waiver WHERE link_id=$1",
    [link.id],
  );
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

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
import { PDFDocument } from "pdf-lib";
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
  // One signing, one download: every child's waiver, each a complete record.
  const { rows } = await getDatabase().query(
    `SELECT * FROM club_signed_waiver WHERE link_id=$1 AND signing_group=(
      SELECT signing_group FROM club_signed_waiver WHERE link_id=$1 ORDER BY signed_at DESC, id DESC LIMIT 1)
    ORDER BY child_index`,
    [link.id],
  );
  if (!rows.length)
    throw new RegistrationError("There is no signed record for this link.", 404);
  const records = rows.map(checkedRecord);
  if (url.searchParams.get("format") === "audit")
    return json(
      records.length === 1
        ? auditRecord(records[0])
        : {
            signingGroup: records[0].signing_group,
            records: records.map((record) => ({
              child: record.snapshot?.registration?.childName,
              ...auditRecord(record),
            })),
          },
    );
  const pdf =
    records.length === 1 ? records[0].pdf : await mergedPdf(records.map((r) => r.pdf));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sunset-duckies-waiver-${records[0].signing_group}.pdf"`,
    },
  });
});
// Each child's waiver stays byte-for-byte the sealed record; the family just
// gets them bound into one file.
async function mergedPdf(pdfs: Buffer[]) {
  const merged = await PDFDocument.create();
  for (const pdf of pdfs) {
    const source = await PDFDocument.load(new Uint8Array(pdf));
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  merged.setTitle("Sunset Duckies - signed waivers");
  merged.setAuthor("Sunset Duckies");
  return Buffer.from(await merged.save());
}

import { readFile } from "node:fs/promises";
import { createHash, verify } from "node:crypto";
const [pdfPath, auditPath] = process.argv.slice(2);
if (!pdfPath || !auditPath)
  throw new Error(
    "Usage: pnpm exec tsx scripts/verify-waiver.ts <signed.pdf> <signature-record.json>",
  );
const pdf = await readFile(pdfPath);
const audit = JSON.parse(await readFile(auditPath, "utf8"));
const hash = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
const message = `${hash(audit.canonicalPayload)}.${hash(pdf)}`;
if (
  message !== audit.signedMessage ||
  hash(pdf) !== audit.pdfSha256 ||
  hash(audit.canonicalPayload) !== audit.payloadSha256 ||
  !verify(
    null,
    Buffer.from(message),
    audit.publicKey,
    Buffer.from(audit.signatureBase64, "base64"),
  )
)
  throw new Error("Record integrity verification failed.");
console.log(
  "PDF and signed registration payload match the saved Ed25519 integrity seal. This checks record integrity, not independent signer identity.",
);

import { readFile } from "node:fs/promises";
import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { RegistrationInput } from "./schema";
import type { waiver } from "./policy";
export type SignedSnapshot = {
  id: string;
  kidId: string;
  term: string;
  signedAt: string;
  version: string;
  registration: Omit<RegistrationInput, "supersedes">;
  policy: typeof waiver;
  evidence: {
    method: string;
    linkId: string;
    supersedes?: string;
    issuedAt: string;
    userAgent: string;
    ip: string;
  };
};
let fontBytes: Promise<Buffer> | undefined;
export async function waiverPdf(snapshot: SignedSnapshot, payloadHash: string) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  fontBytes ??= readFile("src/assets/NotoSans-Regular.ttf");
  const font = await doc.embedFont(await fontBytes, { subset: true });
  const ink = rgb(0.043, 0.086, 0.125);
  let page!: PDFPage;
  let y = 0;
  function newPage() {
    page = doc.addPage([595.28, 841.89]);
    y = 760;
    page.drawRectangle({
      x: 42,
      y: 788,
      width: 511,
      height: 24,
      color: rgb(1, 0.82, 0.25),
    });
    page.drawText("SUNSET DUCKIES  /  SIGNED REGISTRATION", {
      x: 52,
      y: 795,
      size: 10,
      font,
      color: ink,
    });
  }
  newPage();
  function line(text: string, size = 10.5) {
    if (y < 65) newPage();
    page.drawText(text, { x: 48, y, size, font, color: ink });
    y -= size * 1.5;
  }
  function paragraph(text: string, size = 10.5) {
    let current = "";
    for (let word of text.replace(/[\p{Cc}\p{Cf}]/gu, " ").split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= 490) {
        current = candidate;
        continue;
      }
      if (current) {
        line(current, size);
        current = "";
      }
      while (font.widthOfTextAtSize(word, size) > 490) {
        let chunk = "";
        for (const char of word) {
          if (font.widthOfTextAtSize(chunk + char, size) > 490) break;
          chunk += char;
        }
        line(chunk, size);
        word = word.slice(chunk.length);
      }
      current = word;
    }
    if (current) line(current, size);
    y -= 7;
  }
  function heading(text: string) {
    if (y < 110) newPage();
    y -= 8;
    paragraph(text, 14);
  }
  const r = snapshot.registration;
  paragraph(r.childName, 23);
  paragraph(`${snapshot.term} | Signed ${snapshot.signedAt}`);
  paragraph(`Record ${snapshot.id}`, 9);
  if (snapshot.evidence.supersedes)
    paragraph(
      `Corrected version. Replaces record ${snapshot.evidence.supersedes}.`,
      9,
    );
  heading("The child and family");
  paragraph(
    `Date of birth: ${r.dateOfBirth}. Training: ${r.sessionsPerWeek === "2" ? "twice a week (Monday + Friday)" : "once a week"}.`,
  );
  paragraph(
    "Membership covers club training only. Gear, competitions and other events are not included.",
  );
  r.guardians.forEach((g, index) =>
    paragraph(
      `Legal guardian ${index + 1}: ${g.name} (${g.relationship}). Phone: ${g.phone}. Email: ${g.email}.`,
    ),
  );
  paragraph(
    `Emergency: ${r.emergencyName} (${r.emergencyRelationship}), ${r.emergencyPhone}.`,
  );
  paragraph(
    `Medical conditions, allergies or medication: ${r.medicalNotes || "None reported"}.`,
  );
  heading(snapshot.policy.title);
  paragraph(snapshot.policy.introduction);
  heading("I acknowledge that");
  snapshot.policy.acknowledgements.forEach((value) => paragraph(value));
  heading("I agree to");
  snapshot.policy.agreements.forEach((value) => paragraph(value));
  heading("Photo and video choice");
  paragraph(
    r.media === "yes" ? snapshot.policy.mediaYes : snapshot.policy.mediaNo,
  );
  heading("Registration acknowledgements");
  paragraph(
    "Parent / guardian in the water for the entire session: acknowledged. Minimum age and open-water swimming: acknowledged. Waiver: accepted.",
  );
  paragraph(snapshot.policy.reef);
  paragraph(snapshot.policy.gear);
  heading("Electronic signature");
  paragraph(snapshot.policy.electronic);
  paragraph(
    `Signed by ${r.signerName}, the first legal guardian listed above.`,
    13,
  );
  paragraph(
    `Signed at ${snapshot.signedAt} (server UTC). Waiver version ${snapshot.version}.`,
  );
  if (r.signature.length) {
    if (y < 175) newPage();
    page.drawRectangle({
      x: 48,
      y: y - 110,
      width: 330,
      height: 100,
      borderWidth: 1,
      borderColor: ink,
    });
    for (const stroke of r.signature)
      for (let i = 1; i < stroke.length; i++) {
        page.drawLine({
          start: {
            x: 53 + stroke[i - 1][0] * 320,
            y: y - 15 - stroke[i - 1][1] * 90,
          },
          end: { x: 53 + stroke[i][0] * 320, y: y - 15 - stroke[i][1] * 90 },
          thickness: 1.5,
          color: ink,
        });
      }
    y -= 125;
  } else
    paragraph(
      "Signature method: typed name with explicit electronic-signature consent.",
    );
  heading("Record integrity");
  paragraph(`Registration payload SHA-256: ${payloadHash}`, 9);
  paragraph(
    "The club stores this PDF, the exact signed details and wording, and a detached Ed25519 integrity seal. The seal attests to the club's stored record; it is not a third-party identity certificate or an embedded PDF certificate signature.",
    9,
  );
  paragraph(
    `Signing link issued ${snapshot.evidence.issuedAt}. Identity assurance: possession of a private invitation link and self-declared guardian details.`,
    9,
  );
  doc
    .getPages()
    .forEach((p, index) =>
      p.drawText(
        `Sunset Duckies | ${snapshot.id} | ${index + 1} / ${doc.getPageCount()}`,
        { x: 48, y: 32, size: 8, font, color: ink },
      ),
    );
  doc.setTitle(`Signed waiver - ${r.childName}`);
  doc.setAuthor("Sunset Duckies");
  doc.setCreationDate(new Date(snapshot.signedAt));
  return Buffer.from(await doc.save());
}

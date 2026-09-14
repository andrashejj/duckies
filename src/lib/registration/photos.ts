import sharp from "sharp";
import { RegistrationError } from "./records";
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export async function readPhoto(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new RegistrationError("Choose a photo.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_PHOTO_BYTES) {
      await reader.cancel();
      throw new RegistrationError("Choose a photo smaller than 4 MB.", 413);
    }
    chunks.push(value);
  }
  const input = Buffer.concat(chunks);
  const jpeg = input.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const png = input
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    input.toString("ascii", 0, 4) === "RIFF" &&
    input.toString("ascii", 8, 12) === "WEBP";
  if (!jpeg && !png && !webp)
    throw new RegistrationError("Use a JPEG, PNG or WebP photo.", 415);
  try {
    const image = sharp(input, {
      limitInputPixels: 20000000,
      failOn: "warning",
    });
    const meta = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
      (meta.pages ?? 1) !== 1
    )
      throw new Error("Unsupported image");
    // Re-encoding strips GPS/EXIF metadata and any embedded content. Never retain the original file.
    return await image
      .rotate()
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 85 })
      .timeout({ seconds: 5 })
      .toBuffer();
  } catch {
    throw new RegistrationError(
      "This photo could not be read. Use a still JPEG, PNG or WebP up to 20 megapixels.",
    );
  }
}

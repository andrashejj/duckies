import sharp from "sharp";
import type { PoolClient } from "pg";
import { getDatabase } from "./db";
import { sha256 } from "../registration/records";

// Member photo uploads for /gallery. The gallery is members-only: a signed-in
// club member's photo goes live straight away (status `approved`) and the
// member's email stays private. New uploads also create a club feed post
// with the author's display name. An admin can still hide (`rejected`) or delete a photo in
// /admin/gallery. The uploaded file itself is never stored: sharp re-encodes it
// (which also strips EXIF/GPS) into a 1600px image and an 800px thumb.

export class GalleryError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const galleryStatuses = ["approved", "rejected"] as const;
export type GalleryStatus = (typeof galleryStatuses)[number];

export type GalleryUpload = {
  id: string; createdAt: string; uploadedBy: string | null; note: string | null; caption: string | null;
  width: number; height: number; status: GalleryStatus; reviewedAt: string | null; reviewedBy: string | null;
};

const listColumns = 'id,created_at::text AS "createdAt",uploaded_by AS "uploadedBy",note,caption,width,height,status,reviewed_at::text AS "reviewedAt",reviewed_by AS "reviewedBy"';

export async function galleryRateLimit(ip: string) {
  // 20 uploads per 10 minutes per address: enough for a parent emptying a camera roll, not for a script.
  const key = sha256(`gallery:${process.env.BETTER_AUTH_SECRET}:${ip}`);
  const { rows } = await getDatabase().query(
    `INSERT INTO shop_request_limit (key,count,reset_at) VALUES ($1,1,now()+interval '10 minutes')
    ON CONFLICT (key) DO UPDATE SET count=CASE WHEN shop_request_limit.reset_at<=now() THEN 1 ELSE shop_request_limit.count+1 END,
    reset_at=CASE WHEN shop_request_limit.reset_at<=now() THEN now()+interval '10 minutes' ELSE shop_request_limit.reset_at END RETURNING count`,
    [key],
  );
  if (rows[0].count > 20) throw new GalleryError("That is a lot of photos at once. Please wait ten minutes and try again.", 429);
}

/** Reads the raw request body, checks it is a still image, and re-encodes it as WebP at two sizes. */
export async function readUpload(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new GalleryError("Choose a photo.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_UPLOAD_BYTES) { await reader.cancel(); throw new GalleryError("Choose a photo smaller than 12 MB.", 413); }
    chunks.push(value);
  }
  const input = Buffer.concat(chunks);
  const jpeg = input.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const png = input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = input.toString("ascii", 0, 4) === "RIFF" && input.toString("ascii", 8, 12) === "WEBP";
  const heic = input.toString("ascii", 4, 8) === "ftyp";
  if (!jpeg && !png && !webp && !heic) throw new GalleryError("Use a JPEG, PNG, WebP or HEIC photo.", 415);
  try {
    const source = sharp(input, { limitInputPixels: 60_000_000, failOn: "error" });
    const meta = await source.metadata();
    if (!["jpeg", "png", "webp", "heif"].includes(meta.format ?? "") || (meta.pages ?? 1) !== 1) throw new Error("Unsupported image");
    const image = await sharp(input).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).timeout({ seconds: 10 }).toBuffer({ resolveWithObject: true });
    const thumb = await sharp(image.data).resize(800, 800, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).timeout({ seconds: 10 }).toBuffer();
    return { image: image.data, thumb, width: image.info.width, height: image.info.height };
  } catch {
    throw new GalleryError("This photo could not be read. Use a still JPEG, PNG, WebP or HEIC up to 60 megapixels.");
  }
}

export function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, max);
  return text.length ? text : null;
}

export async function insertUpload(input: { uploadedBy: string; note: string | null; ipHash: string; image: Buffer; thumb: Buffer; width: number; height: number }, db: Pick<PoolClient, "query"> = getDatabase()) {
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO gallery_upload(uploaded_by,note,ip_hash,image,thumb,width,height) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
    [input.uploadedBy, input.note, input.ipHash, input.image, input.thumb, input.width, input.height],
  );
  return rows[0].id;
}

export async function listUploads(status?: GalleryStatus): Promise<GalleryUpload[]> {
  const { rows } = await getDatabase().query<GalleryUpload>(
    status ? `SELECT ${listColumns} FROM gallery_upload WHERE status=$1 ORDER BY created_at DESC` : `SELECT ${listColumns} FROM gallery_upload ORDER BY created_at DESC`,
    status ? [status] : [],
  );
  return rows;
}

export async function readImage(id: string, size: "full" | "thumb") {
  const { rows } = await getDatabase().query<{ bytes: Buffer; status: GalleryStatus }>(
    `SELECT ${size === "thumb" ? "thumb" : "image"} AS bytes, status FROM gallery_upload WHERE id=$1`, [id],
  );
  return rows[0] ?? null;
}

export async function reviewUpload(id: string, patch: { status?: GalleryStatus; caption?: string | null }, actor: string) {
  const { rows } = await getDatabase().query<GalleryUpload>(
    `UPDATE gallery_upload SET status=COALESCE($2,status), caption=CASE WHEN $3 THEN $4 ELSE caption END,
      reviewed_at=CASE WHEN $2 IS NULL THEN reviewed_at ELSE now() END, reviewed_by=CASE WHEN $2 IS NULL THEN reviewed_by ELSE $5 END
     WHERE id=$1 RETURNING ${listColumns}`,
    [id, patch.status ?? null, patch.caption !== undefined, patch.caption ?? null, actor],
  );
  if (!rows[0]) throw new GalleryError("Photo not found.", 404);
  return rows[0];
}

export async function deleteUpload(id: string) {
  const { rowCount } = await getDatabase().query("DELETE FROM gallery_upload WHERE id=$1", [id]);
  if (!rowCount) throw new GalleryError("Photo not found.", 404);
}

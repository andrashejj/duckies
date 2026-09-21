import { lockActiveMember } from "./social";
import type { PoolClient } from "pg";
import { gallery } from "../../data/gallery";
import { uuid } from "../registration/schema";
import { getDatabase } from "./db";
import { GalleryError, listUploads } from "./gallery";

export type PhotoActor = { email: string; role: string };
export type ProfilePhoto = { key: string; full: string; thumb: string; caption: string; date: string; width: number; height: number };
export type PhotoKid = { id: string; name: string; canManage: boolean; profilePhoto: string | null };
export type PhotoTag = { id: string; name: string; canManage: boolean };
const curated = gallery.sections.flatMap(section => section.photos).map(photo => ({
  key: `curated:${photo.slug}`, full: `/gallery/asset/${photo.slug}.webp`,
  thumb: `/gallery/asset/${photo.slug}-small.webp`, caption: photo.alt, date: photo.date, width: photo.w, height: photo.h,
}));

export async function galleryPhotos(): Promise<ProfilePhoto[]> {
  return [...(await listUploads("approved")).map(photo => ({
    key: `upload:${photo.id}`, full: `/gallery/photo/${photo.id}.webp`,
    thumb: `/gallery/photo/${photo.id}.webp?size=thumb`,
    caption: photo.caption ?? photo.note ?? "A day with the Duckies", date: photo.createdAt, width: photo.width, height: photo.height,
  })), ...curated].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function photoKids(actor: PhotoActor): Promise<PhotoKid[]> {
  const kids = (await getDatabase().query<Omit<PhotoKid, "profilePhoto"> & { photoVersion: string | null }>(`SELECT k.id,k.name,
    p.updated_at::text AS "photoVersion",
    ($2 OR EXISTS(SELECT 1 FROM club_current_guardian g WHERE g.kid_id=k.id AND g.email=$1)) AS "canManage"
    FROM club_kid k LEFT JOIN club_kid_photo p ON p.kid_id=k.id
    WHERE k.archived_at IS NULL ORDER BY lower(k.name),k.id`, [actor.email, actor.role === "organiser"])).rows;
  // Registration portraits remain private to guardians and organisers. Use the
  // existing protected routes without publishing the portrait to the gallery.
  return kids.map(({ photoVersion, ...kid }) => ({ ...kid,
    profilePhoto: kid.canManage && photoVersion
      ? `/api/${actor.role === "organiser" ? "kids" : "family/kids"}/${kid.id}/photo?v=${encodeURIComponent(photoVersion)}`
      : null,
  }));
}

export async function photoTags(actor: PhotoActor): Promise<Record<string, PhotoTag[]>> {
  const rows = (await getDatabase().query<PhotoTag & { key: string }>(`SELECT t.photo_key AS key,k.id,k.name,
    ($2 OR EXISTS(SELECT 1 FROM club_current_guardian g WHERE g.kid_id=k.id AND g.email=$1)) AS "canManage"
    FROM gallery_kid_tag t JOIN club_kid k ON k.id=t.kid_id
    LEFT JOIN gallery_upload u ON u.id=t.upload_id
    WHERE k.archived_at IS NULL AND (t.upload_id IS NULL OR u.status='approved')
    ORDER BY t.created_at DESC,k.id`, [actor.email, actor.role === "organiser"])).rows;
  const result: Record<string, PhotoTag[]> = {};
  for (const { key, ...tag } of rows) (result[key] ??= []).push(tag);
  return result;
}

export async function requireManagedKid(db: PoolClient, actor: PhotoActor, kidId: string) {
  if (!uuid.safeParse(kidId).success) throw new GalleryError("Duckie not found.", 404);
  // Family edits lock the same child. Recheck access after acquiring that lock.
  const kid = await db.query("SELECT id FROM club_kid WHERE id=$1 AND archived_at IS NULL FOR UPDATE", [kidId]);
  if (!kid.rowCount) throw new GalleryError("Duckie not found.", 404);
  if (actor.role !== "organiser" && !(await db.query("SELECT 1 FROM club_current_guardian WHERE kid_id=$1 AND email=$2", [kidId, actor.email])).rowCount)
    throw new GalleryError("Only this duckie's guardians and organisers can manage their photos.", 403);
}

export async function writePhotoTag(db: PoolClient, actor: PhotoActor, kidId: string, key: string, remove = false) {
  await requireManagedKid(db, actor, kidId);
  let uploadId: string | null = null;
  if (key.startsWith("upload:") && uuid.safeParse(key.slice(7)).success) {
    uploadId = key.slice(7);
    const row = (await db.query("SELECT status FROM gallery_upload WHERE id=$1 FOR SHARE", [uploadId])).rows[0];
    if (!row || row.status !== "approved") throw new GalleryError("Photo not found.", 404);
  } else if (!curated.some(photo => photo.key === key)) throw new GalleryError("Photo not found.", 404);
  if (remove) await db.query("DELETE FROM gallery_kid_tag WHERE kid_id=$1 AND photo_key=$2", [kidId, key]);
  else await db.query(`INSERT INTO gallery_kid_tag(kid_id,photo_key,upload_id,created_by)
    VALUES($1,$2,$3,$4) ON CONFLICT(kid_id,photo_key) DO NOTHING`, [kidId, key, uploadId, actor.email]);
}

export async function changePhotoTag(actor: PhotoActor, kidId: string, key: string, remove: boolean) {
  const db = await getDatabase().connect();
  try { await db.query("BEGIN"); const role = await lockActiveMember(db, actor.email); await writePhotoTag(db, {...actor,role}, kidId, key, remove); await db.query("COMMIT"); }
  catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); }
}

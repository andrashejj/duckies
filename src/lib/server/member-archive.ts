import { getDatabase } from "./db";
import type { ProfilePhoto } from "./photo-profiles";

type ArchivedPost = { id: string; body: string; date: string; photoId: string | null };
export type MemberArchive = { endedAt: string; departureKnown: boolean; photos: ProfilePhoto[]; posts: ArchivedPost[]; comments: { body: string; date: string }[] };
export async function archiveDate(email: string): Promise<string | null> {
  const result = await getDatabase().query('SELECT ended_at::text AS date FROM club_member_archive WHERE email=$1', [email.toLowerCase()]);
  return result.rows[0]?.date ?? null;
}
export async function archivedPhotoAccess(email: string, key: string) {
  return !!(await getDatabase().query(`SELECT 1 FROM club_member_archive a,
    jsonb_array_elements(a.photos) p WHERE a.email=$1 AND p->>'key'=$2`, [email.toLowerCase(),key])).rowCount;
}
export async function readMemberArchive(email: string): Promise<MemberArchive | null> {
  const row = (await getDatabase().query(`SELECT ended_at::text AS "endedAt",departure_known AS "departureKnown",photos,posts,comments
    FROM club_member_archive WHERE email=$1`, [email.toLowerCase()])).rows[0];
  if (!row) return null;
  // Honor current moderation/deletion without exposing any newer metadata.
  const live = new Set((await getDatabase().query("SELECT id::text FROM gallery_upload WHERE status='approved'")).rows.map(r=>r.id));
  const posts = new Set((await getDatabase().query("SELECT id::text FROM club_post WHERE hidden_at IS NULL")).rows.map(r=>r.id));
  return { ...row,
    photos: row.photos.filter((p: ProfilePhoto)=>!p.key.startsWith('upload:') || live.has(p.key.slice(7))).map((p: ProfilePhoto)=>({ ...p,
      full: p.key.startsWith('upload:') ? `/gallery/photo/${p.key.slice(7)}.webp` : `/gallery/asset/${p.key.slice(8)}.webp`,
      thumb: p.key.startsWith('upload:') ? `/gallery/photo/${p.key.slice(7)}.webp?size=thumb` : `/gallery/asset/${p.key.slice(8)}-small.webp`,
    })),
    posts: row.posts.filter((p: ArchivedPost)=>posts.has(p.id) && (!p.photoId || live.has(p.photoId))),
  };
}

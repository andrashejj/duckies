import { randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { gallery } from '../../data/gallery';
import { getDatabase } from './db';
import { GalleryError } from './gallery';
import { sha256 } from '../registration/records';
import { uuid } from '../registration/schema';

type Database = Pool | PoolClient;
type Owner = { id: string; email: string };
type Source = { caption: string; photoKey: string | null };
const curated = new Set(gallery.sections.flatMap(section => section.photos.map(photo => `curated:${photo.slug}`)));
export function validSource(key: string) {
  return key.startsWith('curated:') ? curated.has(key) : /^(post|upload):/.test(key) && uuid.safeParse(key.slice(key.indexOf(':') + 1)).success;
}
export function privatePhotoUrl(key: string) {
  return key.startsWith('upload:') ? `/gallery/photo/${key.slice(7)}.webp` : `/gallery/asset/${key.slice(8)}.webp`;
}
export async function personalPhotoKeys(email: string) {
  const rows = await getDatabase().query(`SELECT 'upload:'||id AS key FROM gallery_upload WHERE uploaded_by=$1
    UNION SELECT t.photo_key AS key FROM gallery_kid_tag t JOIN club_current_guardian g ON g.kid_id=t.kid_id WHERE g.email=$1`, [email.toLowerCase()]);
  return rows.rows.map(row => row.key as string);
}
// Resolve entitlement on every read, including anonymous media requests. Never
// reuse organiser moderation privileges as permission to publish another family.
async function sourceFor(db: Database, owner: Owner, key: string): Promise<Source | null> {
  if (!validSource(key)) return null;
  const active = !!(await db.query('SELECT 1 FROM club_member WHERE email=$1', [owner.email.toLowerCase()])).rowCount;
  let source: Source | null = null;
  if (active) {
    if (key.startsWith('post:')) {
      const post = (await db.query('SELECT body,photo_id FROM club_post WHERE id=$1 AND author_id=$2 AND hidden_at IS NULL', [key.slice(5), owner.id])).rows[0];
      if (post) source = { caption: post.body, photoKey: post.photo_id ? `upload:${post.photo_id}` : null };
    } else {
      const owned = await db.query(`SELECT 1 FROM gallery_upload WHERE 'upload:'||id=$1 AND uploaded_by=$2
        UNION SELECT 1 FROM gallery_kid_tag t JOIN club_current_guardian g ON g.kid_id=t.kid_id WHERE t.photo_key=$1 AND g.email=$2`, [key, owner.email.toLowerCase()]);
      if (owned.rowCount) source = { caption: '', photoKey: key };
    }
  } else {
    const archive = (await db.query('SELECT photos,posts FROM club_member_archive WHERE email=$1', [owner.email.toLowerCase()])).rows[0];
    if (key.startsWith('post:')) {
      const post = archive?.posts.find((p: { id: string }) => p.id === key.slice(5));
      if (post) source = { caption: post.body, photoKey: post.photoId ? `upload:${post.photoId}` : null };
    } else if (archive?.photos.some((p: { key: string }) => p.key === key)) source = { caption: '', photoKey: key };
  }
  if (!source) return null;
  if (key.startsWith('post:') && !(await db.query('SELECT 1 FROM club_post WHERE id=$1 AND hidden_at IS NULL', [key.slice(5)])).rowCount) return null;
  if (source.photoKey?.startsWith('upload:') && !(await db.query("SELECT 1 FROM gallery_upload WHERE id=$1 AND status='approved'", [source.photoKey.slice(7)])).rowCount) return null;
  if (source.photoKey?.startsWith('curated:') && !curated.has(source.photoKey)) return null;
  return source;
}
export async function ownedPublicLinks(ownerId: string) {
  return (await getDatabase().query<{sourceKey:string;caption:string}>(`SELECT source_key AS "sourceKey",caption FROM club_public_share
    WHERE owner_id=$1 AND revoked_at IS NULL ORDER BY created_at DESC`, [ownerId])).rows;
}
export async function sharePreview(owner: Owner, key: string) {
  const db = getDatabase();
  const source = await sourceFor(db, owner, key);
  const share = (await db.query('SELECT token,caption,photo_key FROM club_public_share WHERE owner_id=$1 AND source_key=$2 AND revoked_at IS NULL', [owner.id, key])).rows[0];
  if (!source && !share) throw new GalleryError('This moment is not available to share.', 404);
  return { available: !!source, caption: share?.caption ?? source?.caption ?? '', photo: source?.photoKey ? privatePhotoUrl(source.photoKey) : null,
    path: share ? `/s/${share.token}` : null };
}
export async function createPublicShare(owner: Owner, key: string, caption: string) {
  const db = await getDatabase().connect();
  try {
    await db.query('BEGIN');
    // Serialise duplicate creation. Membership removal uses the same shared lock
    // as social writes so departure snapshots cannot race this decision.
    await db.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [owner.id]);
    await db.query('SELECT email FROM club_member WHERE email=$1 FOR SHARE', [owner.email.toLowerCase()]);
    const source = await sourceFor(db, owner, key);
    if (!source) throw new GalleryError('Only your own posts and profile photos can be shared.', 403);
    if (!source.photoKey && !caption.trim()) throw new GalleryError('Add a caption to this text post.');
    const current = (await db.query('SELECT token FROM club_public_share WHERE owner_id=$1 AND source_key=$2 AND revoked_at IS NULL', [owner.id, key])).rows[0];
    if (current) throw new GalleryError('This moment already has a public link. Stop sharing before creating a new version.', 409);
    const limit = (await db.query(`INSERT INTO shop_request_limit(key,count,reset_at) VALUES($1,1,now()+interval '1 minute')
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN shop_request_limit.reset_at<=now() THEN 1 ELSE shop_request_limit.count+1 END,
      reset_at=CASE WHEN shop_request_limit.reset_at<=now() THEN now()+interval '1 minute' ELSE shop_request_limit.reset_at END RETURNING count`, [sha256(`public-share:${owner.id}`)])).rows[0];
    if (limit.count > 20) throw new GalleryError('Take a moment before creating another public link.', 429);
    const token = randomBytes(32).toString('base64url');
    await db.query('INSERT INTO club_public_share(owner_id,source_key,photo_key,caption,token) VALUES($1,$2,$3,$4,$5)', [owner.id, key, source.photoKey, caption.trim(), token]);
    await db.query('COMMIT');
    return { path: `/s/${token}` };
  } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
export async function revokePublicShare(owner: Owner, key: string) {
  // Owners can revoke even after their source or family access is removed.
  await getDatabase().query('UPDATE club_public_share SET revoked_at=now() WHERE owner_id=$1 AND source_key=$2 AND revoked_at IS NULL', [owner.id, key]);
}
export async function readPublicShare(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const db = getDatabase();
  const row = (await db.query(`SELECT s.caption,s.photo_key,s.source_key,u.id,u.email FROM club_public_share s
    JOIN "user" u ON u.id=s.owner_id WHERE s.token=$1 AND s.revoked_at IS NULL`, [token])).rows[0];
  if (!row) return null;
  const source = await sourceFor(db, row, row.source_key);
  if (!source || source.photoKey !== row.photo_key) return null;
  return { caption: row.caption as string, photoKey: row.photo_key as string | null };
}

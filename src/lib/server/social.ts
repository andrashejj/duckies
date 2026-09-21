import type { PoolClient } from "pg";
import { getDatabase } from "./db";
import { GalleryError } from "./gallery";
import { sha256 } from "../registration/records";

export type SocialActor = { userId: string; email: string; role: string };
export type SocialPerson = { id: string; name: string; active: boolean };
export type SocialComment = { id: string; body: string; date: string; author: SocialPerson; canDelete: boolean };
export type SocialPost = { id: string; body: string; date: string; photoId: string | null; author: SocialPerson; likes: number; liked: boolean; comments: number; canDelete: boolean; canShare: boolean; tags: { id:string; name:string }[] };
const name = `COALESCE(NULLIF(pp.name,''),NULLIF(u.name,''),'Club member')`;
const visible = `p.hidden_at IS NULL AND (p.photo_id IS NULL OR photo.status='approved')`;
const person = `jsonb_build_object('id',u.id,'name',${name},'active',EXISTS(SELECT 1 FROM club_member m WHERE m.email=lower(u.email)))`;

// Lock membership for the whole write. Revocation waits, snapshots the completed
// write, then removes access; a write starting after revocation fails here.
export async function lockActiveMember(db: PoolClient, email: string) {
  const row = (await db.query("SELECT role FROM club_member WHERE email=$1 FOR SHARE",[email.toLowerCase()])).rows[0];
  if (!row) throw new GalleryError("Sharing is for active club members.",403);
  return row.role as string;
}
export async function socialWrite<T>(actor: SocialActor, action: (db:PoolClient,role:string)=>Promise<T>) {
  const db = await getDatabase().connect();
  try {
    await db.query('BEGIN');
    const role = await lockActiveMember(db,actor.email);
    const key = sha256(`social:${actor.userId}`);
    const limit = (await db.query(`INSERT INTO shop_request_limit(key,count,reset_at) VALUES($1,1,now()+interval '1 minute')
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN shop_request_limit.reset_at<=now() THEN 1 ELSE shop_request_limit.count+1 END,
      reset_at=CASE WHEN shop_request_limit.reset_at<=now() THEN now()+interval '1 minute' ELSE shop_request_limit.reset_at END RETURNING count`,[key])).rows[0];
    if (limit.count>40) throw new GalleryError('Take a moment before sharing again.',429);
    const result=await action(db,role); await db.query('COMMIT'); return result;
  } catch(error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
export async function listPosts(actor:SocialActor,options:{author?:string;before?:string;id?:string}={}) {
  const rows=(await getDatabase().query<SocialPost>(`SELECT p.id,p.body,p.created_at::text AS date,p.photo_id AS "photoId",${person} AS author,
    (SELECT count(*)::int FROM club_post_like l WHERE l.post_id=p.id) AS likes,
    EXISTS(SELECT 1 FROM club_post_like l WHERE l.post_id=p.id AND l.user_id=$1) AS liked,
    (SELECT count(*)::int FROM club_post_comment c WHERE c.post_id=p.id) AS comments,
    (p.author_id=$1 OR $2) AS "canDelete", (p.author_id=$1) AS "canShare",
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',k.id,'name',k.name)) FROM gallery_kid_tag t JOIN club_kid k ON k.id=t.kid_id
      WHERE t.upload_id=p.photo_id AND k.archived_at IS NULL),'[]') AS tags
    FROM club_post p JOIN "user" u ON u.id=p.author_id LEFT JOIN club_parent_profile pp ON pp.email=lower(u.email)
    LEFT JOIN gallery_upload photo ON photo.id=p.photo_id
    WHERE ${visible} AND ($3::text IS NULL OR p.author_id=$3) AND ($4::uuid IS NULL OR p.id=$4)
    AND ($5::uuid IS NULL OR (p.created_at,p.id)<(SELECT created_at,id FROM club_post WHERE id=$5))
    ORDER BY p.created_at DESC,p.id DESC LIMIT 21`,[actor.userId,actor.role==='organiser',options.author??null,options.id??null,options.before??null])).rows;
  return {posts:rows.slice(0,20),next:rows.length>20?rows[19].id:null};
}
export async function people() {
  return (await getDatabase().query<SocialPerson>(`SELECT u.id,${name} AS name,true AS active FROM "user" u
    JOIN club_member m ON m.email=lower(u.email) LEFT JOIN club_parent_profile pp ON pp.email=m.email
    WHERE u."emailVerified"=true ORDER BY lower(${name}),u.id`)).rows;
}
export async function socialPerson(id:string) {
  return (await getDatabase().query<SocialPerson>(`SELECT u.id,${name} AS name,EXISTS(SELECT 1 FROM club_member m WHERE m.email=lower(u.email)) AS active
    FROM "user" u LEFT JOIN club_parent_profile pp ON pp.email=lower(u.email)
    WHERE u.id=$1 AND (EXISTS(SELECT 1 FROM club_member m WHERE m.email=lower(u.email)) OR EXISTS(SELECT 1 FROM club_post p WHERE p.author_id=u.id AND p.hidden_at IS NULL))`,[id])).rows[0]??null;
}
export async function createPost(db:PoolClient,actor:SocialActor,body:string,photoId:string|null=null) {
  return (await db.query<{id:string}>('INSERT INTO club_post(author_id,body,photo_id) VALUES($1,$2,$3) RETURNING id',[actor.userId,body,photoId])).rows[0].id;
}
async function requirePost(db:PoolClient,id:string) {
  const row=(await db.query(`SELECT p.author_id,p.photo_id FROM club_post p LEFT JOIN gallery_upload photo ON photo.id=p.photo_id
    WHERE p.id=$1 AND ${visible} FOR UPDATE OF p`,[id])).rows[0];
  if(!row)throw new GalleryError('Post not found.',404);return row;
}
export async function likePost(actor:SocialActor,id:string,liked:boolean) {
  return socialWrite(actor,async db=>{await requirePost(db,id);
    if(liked)await db.query('INSERT INTO club_post_like(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,actor.userId]);
    else await db.query('DELETE FROM club_post_like WHERE post_id=$1 AND user_id=$2',[id,actor.userId]);
  });
}
export async function commentPost(actor:SocialActor,id:string,body:string) {
  return socialWrite(actor,async db=>{await requirePost(db,id);
    return (await db.query('INSERT INTO club_post_comment(post_id,author_id,body) VALUES($1,$2,$3) RETURNING id',[id,actor.userId,body])).rows[0].id;
  });
}
export async function postComments(actor:SocialActor,id:string,before?:string) {
  const rows=(await getDatabase().query<SocialComment>(`SELECT c.id,c.body,c.created_at::text AS date,${person} AS author,
    (c.author_id=$1 OR p.author_id=$1 OR $2) AS "canDelete"
    FROM club_post_comment c JOIN club_post p ON p.id=c.post_id JOIN "user" u ON u.id=c.author_id
    LEFT JOIN club_parent_profile pp ON pp.email=lower(u.email) LEFT JOIN gallery_upload photo ON photo.id=p.photo_id
    WHERE p.id=$3 AND ${visible} AND ($4::uuid IS NULL OR (c.created_at,c.id)<(SELECT created_at,id FROM club_post_comment WHERE id=$4 AND post_id=$3))
    ORDER BY c.created_at DESC,c.id DESC LIMIT 51`,[actor.userId,actor.role==='organiser',id,before??null])).rows;
  return {comments:rows.slice(0,50),next:rows.length>50?rows[49].id:null};
}
export async function removePostContent(actor:SocialActor,id:string,commentId?:string) {
  return socialWrite(actor,async(db,role)=>{
    const post=await requirePost(db,id);
    if(commentId){
      const removed=await db.query(`DELETE FROM club_post_comment WHERE id=$1 AND post_id=$2 AND (author_id=$3 OR $4)`,
        [commentId,id,actor.userId,role==='organiser'||post.author_id===actor.userId]);
      if(!removed.rowCount)throw new GalleryError('Comment not found or not yours to remove.',403);
    }else{
      if(post.author_id!==actor.userId && role!=='organiser')throw new GalleryError('Only the author or an organiser can remove this post.',403);
      await db.query('UPDATE club_post SET hidden_at=now() WHERE id=$1',[id]);
      if(post.photo_id)await db.query("UPDATE gallery_upload SET status='rejected',reviewed_at=now(),reviewed_by=$2 WHERE id=$1",[post.photo_id,actor.email]);
    }
  });
}

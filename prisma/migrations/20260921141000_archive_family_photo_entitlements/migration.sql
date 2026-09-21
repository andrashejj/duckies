-- Archived kids keep their family photo history. Explicit guardian revocation
-- still wins. This view is used only when freezing a departing member archive.
CREATE VIEW club_photo_archive_guardian AS
WITH signed AS (
  SELECT DISTINCT ON (k.id, lower(trim(g->>'email')))
    k.id AS kid_id, lower(trim(g->>'email')) AS email,
    g->>'name' AS name, g->>'relationship' AS relationship, g->>'phone' AS phone
  FROM club_kid k JOIN LATERAL (
    SELECT snapshot->'registration' AS r FROM club_signed_waiver
    WHERE kid_id=k.id ORDER BY signed_at DESC, id DESC LIMIT 1
  ) w ON true, jsonb_array_elements(COALESCE(w.r->'guardians','[]'::jsonb)) g
  WHERE COALESCE(trim(g->>'email'),'')<>''
)
SELECT s.* FROM signed s WHERE NOT EXISTS (
  SELECT 1 FROM club_guardian_access a WHERE a.kid_id=s.kid_id AND a.email=s.email
)
UNION ALL
SELECT a.kid_id,a.email,a.name,a.relationship,a.phone
FROM club_guardian_access a JOIN club_kid k ON k.id=a.kid_id
WHERE a.revoked_at IS NULL;

CREATE OR REPLACE FUNCTION snapshot_member_archive(member_email text, include_family boolean) RETURNS void AS $$
BEGIN
  INSERT INTO club_member_archive(email,ended_at,departure_known,photos,posts,comments)
  VALUES (member_email,clock_timestamp(),include_family,
    COALESCE((SELECT jsonb_agg(photo ORDER BY photo->>'date' DESC) FROM (
      SELECT jsonb_build_object('key','upload:'||u.id,'caption',COALESCE(u.caption,u.note,'A club memory'),
        'date',u.created_at,'width',u.width,'height',u.height) AS photo
      FROM gallery_upload u WHERE u.status='approved' AND (u.uploaded_by=member_email OR
        (include_family AND EXISTS(SELECT 1 FROM gallery_kid_tag t JOIN club_photo_archive_guardian g ON g.kid_id=t.kid_id
          WHERE t.upload_id=u.id AND g.email=member_email)))
      UNION ALL
      SELECT jsonb_build_object('key',t.photo_key,'caption','A memory with your duckies',
        'date',min(t.created_at),'width',800,'height',800)
      FROM gallery_kid_tag t JOIN club_photo_archive_guardian g ON g.kid_id=t.kid_id
      WHERE include_family AND g.email=member_email AND t.upload_id IS NULL GROUP BY t.photo_key
    ) personal_photos),'[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'body',p.body,'date',p.created_at,'photoId',p.photo_id) ORDER BY p.created_at DESC)
      FROM club_post p JOIN "user" u ON u.id=p.author_id
      LEFT JOIN gallery_upload photo ON photo.id=p.photo_id
      WHERE lower(u.email)=member_email AND p.hidden_at IS NULL AND (p.photo_id IS NULL OR photo.status='approved')),'[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('body',c.body,'date',c.created_at) ORDER BY c.created_at DESC)
      FROM club_post_comment c JOIN "user" u ON u.id=c.author_id JOIN club_post p ON p.id=c.post_id
      WHERE lower(u.email)=member_email AND p.hidden_at IS NULL),'[]'::jsonb))
  ON CONFLICT(email) DO UPDATE SET ended_at=EXCLUDED.ended_at,departure_known=EXCLUDED.departure_known,photos=EXCLUDED.photos,posts=EXCLUDED.posts,comments=EXCLUDED.comments;
END;
$$ LANGUAGE plpgsql;

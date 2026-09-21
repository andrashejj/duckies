CREATE TABLE club_post (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  photo_id uuid UNIQUE REFERENCES gallery_upload(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  hidden_at timestamptz,
  CHECK (body <> '' OR photo_id IS NOT NULL)
);
CREATE INDEX club_post_feed ON club_post(created_at DESC,id DESC) WHERE hidden_at IS NULL;
CREATE INDEX club_post_author ON club_post(author_id,created_at DESC);
CREATE TABLE club_post_like (
  post_id uuid NOT NULL REFERENCES club_post(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  PRIMARY KEY(post_id,user_id)
);
CREATE TABLE club_post_comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES club_post(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX club_post_comment_post ON club_post_comment(post_id,created_at,id);
CREATE TABLE club_member_archive (
  email text PRIMARY KEY,
  ended_at timestamptz NOT NULL DEFAULT now(),
  departure_known boolean NOT NULL DEFAULT true,
  photos jsonb NOT NULL DEFAULT '[]',
  posts jsonb NOT NULL DEFAULT '[]',
  comments jsonb NOT NULL DEFAULT '[]'
);

-- Freeze ownership and text at departure. Later tags, captions and comments
-- must never expand a former member's access. All revocation paths, including
-- the CLI, go through this trigger in the same transaction as membership loss.
CREATE FUNCTION snapshot_member_archive(member_email text, include_family boolean) RETURNS void AS $$
BEGIN
  INSERT INTO club_member_archive(email,ended_at,departure_known,photos,posts,comments)
  VALUES (member_email,clock_timestamp(),include_family,
    COALESCE((SELECT jsonb_agg(photo ORDER BY photo->>'date' DESC) FROM (
      SELECT jsonb_build_object('key','upload:'||u.id,'caption',COALESCE(u.caption,u.note,'A club memory'),
        'date',u.created_at,'width',u.width,'height',u.height) AS photo
      FROM gallery_upload u WHERE u.status='approved' AND (u.uploaded_by=member_email OR
        (include_family AND EXISTS(SELECT 1 FROM gallery_kid_tag t JOIN club_current_guardian g ON g.kid_id=t.kid_id
          WHERE t.upload_id=u.id AND g.email=member_email)))
      UNION ALL
      SELECT jsonb_build_object('key',t.photo_key,'caption','A memory with your duckies',
        'date',min(t.created_at),'width',800,'height',800)
      FROM gallery_kid_tag t JOIN club_current_guardian g ON g.kid_id=t.kid_id
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
CREATE FUNCTION archive_departing_member() RETURNS trigger AS $$
BEGIN
  PERFORM snapshot_member_archive(OLD.email,true);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER archive_departing_member BEFORE DELETE ON club_member FOR EACH ROW EXECUTE FUNCTION archive_departing_member();

-- Upload ownership proves earlier membership. Without historical departure
-- dates, recover only these members' own uploads, never other people's tags.
SELECT snapshot_member_archive(uploaded_by,false) FROM
  (SELECT DISTINCT uploaded_by FROM gallery_upload WHERE uploaded_by IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM club_member m WHERE m.email=uploaded_by)) former_uploaders;

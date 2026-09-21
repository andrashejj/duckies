-- A gallery photo can appear on several duckies' profiles. Registration
-- portraits and signed records are deliberately not part of this gallery.
CREATE TABLE gallery_kid_tag (
  kid_id uuid NOT NULL REFERENCES club_kid(id) ON DELETE CASCADE,
  photo_key text NOT NULL,
  upload_id uuid REFERENCES gallery_upload(id) ON DELETE CASCADE,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kid_id, photo_key),
  CHECK ((upload_id IS NOT NULL AND photo_key = 'upload:' || upload_id::text)
    OR (upload_id IS NULL AND photo_key ~ '^curated:[a-z0-9-]+$'))
);
CREATE INDEX gallery_kid_tag_photo ON gallery_kid_tag(photo_key);
CREATE INDEX gallery_kid_tag_upload ON gallery_kid_tag(upload_id);

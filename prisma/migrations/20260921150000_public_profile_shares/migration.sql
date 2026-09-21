CREATE TABLE club_public_share (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  source_key text NOT NULL,
  photo_key text,
  caption text NOT NULL CHECK (char_length(caption)<=2000),
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX club_public_share_owner_source_active ON club_public_share(owner_id,source_key) WHERE revoked_at IS NULL;

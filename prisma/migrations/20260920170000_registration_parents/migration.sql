BEGIN;
-- A registration may correct profiles it created, but never replace a profile
-- or photo subsequently maintained by its signed-in owner or an organiser.
ALTER TABLE club_parent_profile ADD COLUMN registration_link_id UUID;
ALTER TABLE club_parent_profile ADD COLUMN photo_registration_link_id UUID;
CREATE TABLE club_registration_parent_photo (
  link_id UUID NOT NULL REFERENCES club_registration_link(id),
  email TEXT NOT NULL,
  image BYTEA NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(link_id,email)
);
COMMIT;

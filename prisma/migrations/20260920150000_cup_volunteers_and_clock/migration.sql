BEGIN;
ALTER TABLE cup_heat ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 10 CHECK (duration_minutes BETWEEN 1 AND 60);
ALTER TABLE cup_heat ADD COLUMN ends_at TIMESTAMPTZ(6);
UPDATE cup_heat SET ends_at=started_at + interval '10 minutes' WHERE status='running';
CREATE TABLE club_parent_profile (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  image BYTEA,
  photo_updated_at TIMESTAMPTZ(6),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE TABLE cup_heat_volunteer (
  heat_id UUID NOT NULL REFERENCES cup_heat(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  requested_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  reviewed_by TEXT,
  PRIMARY KEY (heat_id, email)
);
COMMIT;

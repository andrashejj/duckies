CREATE TABLE club_semester (
  id text PRIMARY KEY CHECK (id ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,39}$'),
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 100),
  starts_on date,
  ends_on date,
  child_fee_mur numeric(10,2) NOT NULL CHECK (child_fee_mur >= 0),
  family_fee_mur numeric(10,2) NOT NULL CHECK (family_fee_mur >= 0),
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on)
);
CREATE UNIQUE INDEX one_current_club_semester ON club_semester(is_current) WHERE is_current;
INSERT INTO club_semester (id,label,starts_on,child_fee_mur,family_fee_mur,is_current)
VALUES ('2026-S2','September 2026 semester','2026-09-11',3000,5000,true);
-- Preserve all legacy term references without rewriting immutable signed/payment rows.
INSERT INTO club_semester (id,label,child_fee_mur,family_fee_mur)
SELECT term,term,3000,5000 FROM (
  SELECT term FROM club_payment_event UNION SELECT term FROM club_registration_link UNION SELECT term FROM club_signed_waiver
) history ON CONFLICT (id) DO NOTHING;
ALTER TABLE club_payment_event ADD FOREIGN KEY (term) REFERENCES club_semester(id);
ALTER TABLE club_registration_link ADD FOREIGN KEY (term) REFERENCES club_semester(id);
ALTER TABLE club_signed_waiver ADD FOREIGN KEY (term) REFERENCES club_semester(id);

CREATE TABLE club_kid_photo (
  kid_id uuid PRIMARY KEY REFERENCES club_kid(id),
  image bytea NOT NULL CHECK (octet_length(image) <= 1048576),
  updated_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by text REFERENCES "user"(id),
  source text NOT NULL CHECK (source IN ('organiser','guardian'))
);
CREATE TABLE club_registration_photo (
  link_id uuid PRIMARY KEY REFERENCES club_registration_link(id),
  image bytea NOT NULL CHECK (octet_length(image) <= 1048576),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

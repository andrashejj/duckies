ALTER TABLE club_kid ADD COLUMN archived_at timestamptz;
ALTER TABLE club_kid ADD COLUMN contact_name text;
ALTER TABLE club_kid ADD COLUMN contact_phone text;

CREATE TABLE club_registration_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id uuid NOT NULL REFERENCES club_kid(id),
  token_hash text NOT NULL UNIQUE,
  term text NOT NULL,
  created_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX club_registration_link_kid ON club_registration_link(kid_id, created_at DESC);

CREATE TABLE club_signed_waiver (
  id uuid PRIMARY KEY,
  kid_id uuid NOT NULL REFERENCES club_kid(id),
  link_id uuid NOT NULL UNIQUE REFERENCES club_registration_link(id),
  term text NOT NULL,
  signed_at timestamptz NOT NULL,
  snapshot jsonb NOT NULL,
  canonical_payload text NOT NULL,
  payload_sha256 text NOT NULL,
  pdf bytea NOT NULL,
  pdf_sha256 text NOT NULL,
  seal text NOT NULL,
  public_key text NOT NULL
);
CREATE INDEX club_signed_waiver_kid ON club_signed_waiver(kid_id, signed_at DESC);

CREATE TABLE club_payment_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id uuid NOT NULL REFERENCES club_kid(id),
  term text NOT NULL,
  status text NOT NULL CHECK (status IN ('paid', 'unpaid')),
  amount_mur numeric(10,2) CHECK (amount_mur >= 0),
  note text NOT NULL,
  actor_email text NOT NULL CHECK (actor_email = 'andras@hejj.xyz'),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX club_payment_event_kid ON club_payment_event(kid_id, term, recorded_at DESC);

CREATE FUNCTION protect_club_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Club signed records and payment history are append-only'; END $$;
CREATE TRIGGER immutable_waiver BEFORE UPDATE OR DELETE ON club_signed_waiver FOR EACH ROW EXECUTE FUNCTION protect_club_record();
CREATE TRIGGER immutable_payment BEFORE UPDATE OR DELETE ON club_payment_event FOR EACH ROW EXECUTE FUNCTION protect_club_record();

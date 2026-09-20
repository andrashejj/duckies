-- Administrative corrections do not alter a guardian's signed document.
-- A subsequent guardian signature becomes the new source of truth.
CREATE TABLE club_birth_date_correction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id uuid NOT NULL REFERENCES club_kid(id),
  waiver_id uuid NOT NULL REFERENCES club_signed_waiver(id),
  previous_date date NOT NULL,
  date_of_birth date NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  actor_email text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX club_birth_date_correction_waiver ON club_birth_date_correction (waiver_id, recorded_at DESC);
CREATE TRIGGER immutable_birth_date_correction BEFORE UPDATE OR DELETE ON club_birth_date_correction
  FOR EACH ROW EXECUTE FUNCTION protect_club_record();

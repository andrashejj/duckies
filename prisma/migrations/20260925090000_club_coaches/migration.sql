-- Coaches and trainers call the training roll. Organisers pick them from the
-- parents and volunteers, or add an outside trainer by email; the name is the
-- one the club knows them by. Removing a coach ends roll-call access only:
-- the attendance they recorded keeps its audit trail.
CREATE TABLE club_coach (
  email text PRIMARY KEY CHECK (email = lower(btrim(email)) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

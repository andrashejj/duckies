CREATE TABLE IF NOT EXISTS club_member (
  email text PRIMARY KEY CHECK (email = lower(trim(email))),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'organiser')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_kid (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  created_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

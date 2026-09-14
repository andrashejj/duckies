CREATE TABLE branding_access (
  email text PRIMARY KEY CHECK (email = lower(email)),
  name text NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','revoked')),
  can_edit boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE TABLE branding_access_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL REFERENCES branding_access(email),
  status text NOT NULL,
  can_edit boolean NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Project Molt plan: milestones and tasks with owners, so the brief, the
-- timeline and the board read one record. Content is seeded from
-- src/data/plan-tasks.ts the first time the plan is read from an empty table.
CREATE TABLE plan_person (
  id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9-]{1,40}$'),
  name text NOT NULL,
  email text UNIQUE CHECK (email = lower(email)),
  sort integer NOT NULL DEFAULT 0
);
CREATE TABLE plan_milestone (
  id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9-]{1,40}$'),
  track text NOT NULL CHECK (track IN ('phase1','estelle','dates')),
  code text NOT NULL,
  title text NOT NULL,
  date_label text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL CHECK (ends_on >= starts_on),
  deliverable text NOT NULL DEFAULT '',
  owner_id text REFERENCES plan_person(id),
  links jsonb NOT NULL DEFAULT '[]',
  sort integer NOT NULL
);
CREATE TABLE plan_task (
  id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9-]{1,40}$'),
  milestone_id text NOT NULL REFERENCES plan_milestone(id),
  text text NOT NULL CHECK (length(text) BETWEEN 3 AND 400),
  owner_id text REFERENCES plan_person(id),
  due_on date,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done')),
  sort integer NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'seed',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'seed'
);
CREATE INDEX plan_task_milestone_idx ON plan_task (milestone_id, sort);
CREATE INDEX plan_task_owner_idx ON plan_task (owner_id, status);
CREATE TABLE plan_task_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id text NOT NULL REFERENCES plan_task(id),
  status text NOT NULL,
  owner_id text,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Estelle and Dori are pre-approved editors: they can sign in with the
-- email-OTP code straight away and see the workspace once they do.
INSERT INTO branding_access (email, name, reason, status, can_edit, verified_at, decided_at, decided_by)
VALUES
  ('niki.este.2022@ksz.edu-zg.ch', 'Estelle Lily Nikischer', 'Onsite in Tamarin 29 Sep – 19 Oct: granola, business case, customers, shops, the Cup.', 'approved', true, now(), now(), 'andras@hejj.xyz'),
  ('onody.dora@gmail.com', 'Dori Onody', 'Sunset Duckies co-organiser.', 'approved', true, now(), now(), 'andras@hejj.xyz')
ON CONFLICT (email) DO UPDATE SET status = 'approved', can_edit = true,
  verified_at = COALESCE(branding_access.verified_at, now()), decided_at = now(), decided_by = EXCLUDED.decided_by, version = branding_access.version + 1;
INSERT INTO branding_access_event (email, status, can_edit, actor)
VALUES ('niki.este.2022@ksz.edu-zg.ch', 'approved', true, 'andras@hejj.xyz'), ('onody.dora@gmail.com', 'approved', true, 'andras@hejj.xyz');

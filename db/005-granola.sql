-- Shared product-development recipes, independent of shop and club finances.
CREATE TABLE granola_pack (
  id text PRIMARY KEY CHECK (id IN ('basic', 'sports', 'champ')),
  recipe jsonb NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL
);
CREATE TABLE granola_revision (
  pack_id text NOT NULL REFERENCES granola_pack(id),
  version integer NOT NULL CHECK (version > 0),
  recipe jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  PRIMARY KEY (pack_id, version)
);

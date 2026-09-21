-- Editable family access is separate from immutable signed registrations.
CREATE TABLE club_guardian_access (
  kid_id uuid NOT NULL REFERENCES club_kid(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(trim(email))),
  name text NOT NULL,
  relationship text NOT NULL,
  phone text NOT NULL,
  revoked_at timestamptz,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kid_id, email)
);
CREATE INDEX club_guardian_access_email ON club_guardian_access(email);

-- Existing registrations become shared families immediately, without rewriting
-- their signatures or copying personal records. Explicit changes override them.
CREATE VIEW club_current_guardian AS
WITH signed AS (
  SELECT DISTINCT ON (k.id, lower(trim(g->>'email')))
    k.id AS kid_id, lower(trim(g->>'email')) AS email,
    g->>'name' AS name, g->>'relationship' AS relationship, g->>'phone' AS phone
  FROM club_kid k JOIN LATERAL (
    SELECT snapshot->'registration' AS r FROM club_signed_waiver
    WHERE kid_id=k.id ORDER BY signed_at DESC, id DESC LIMIT 1
  ) w ON true, jsonb_array_elements(COALESCE(w.r->'guardians','[]'::jsonb)) g
  WHERE k.archived_at IS NULL AND COALESCE(trim(g->>'email'),'')<>''
)
SELECT s.* FROM signed s WHERE NOT EXISTS (
  SELECT 1 FROM club_guardian_access a WHERE a.kid_id=s.kid_id AND a.email=s.email
)
UNION ALL
SELECT a.kid_id,a.email,a.name,a.relationship,a.phone
FROM club_guardian_access a JOIN club_kid k ON k.id=a.kid_id
WHERE a.revoked_at IS NULL AND k.archived_at IS NULL;

-- Tie shared orders to specific kids, never the whole co-parent account.
CREATE TABLE club_order_family (
  order_id text NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  kid_id uuid NOT NULL REFERENCES club_kid(id) ON DELETE CASCADE,
  PRIMARY KEY (order_id,kid_id)
);
CREATE INDEX club_order_family_kid ON club_order_family(kid_id);
-- Existing receipts: attribute by the authenticated buyer, or the receipt
-- address only for a guest order. Immutable receipt and payment fields stay put.
INSERT INTO club_order_family(order_id,kid_id)
SELECT DISTINCT o.id,g.kid_id FROM "Order" o LEFT JOIN "user" u ON u.id=o."userId"
JOIN club_current_guardian g ON g.email=lower(trim(CASE WHEN o."userId" IS NULL THEN o.email ELSE u.email END));

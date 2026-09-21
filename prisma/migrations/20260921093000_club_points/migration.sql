-- Rates are versioned: changing them affects future activities only.
CREATE TABLE club_point_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  training integer NOT NULL CHECK (training BETWEEN 0 AND 1000),
  granola integer NOT NULL CHECK (granola BETWEEN 0 AND 1000),
  cup integer NOT NULL CHECK (cup BETWEEN 0 AND 1000),
  recorded_by text NOT NULL
);
CREATE INDEX club_point_rule_effective ON club_point_rule(effective_at DESC);
INSERT INTO club_point_rule(effective_at,training,granola,cup,recorded_by)
VALUES ('1970-01-01T00:00:00Z',10,5,20,'migration');

CREATE TABLE club_training (
  date date PRIMARY KEY,
  points integer NOT NULL CHECK (points BETWEEN 0 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);
CREATE TABLE club_attendance (
  date date NOT NULL REFERENCES club_training(date),
  kid_id uuid NOT NULL REFERENCES club_kid(id) ON DELETE CASCADE,
  present boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_by text NOT NULL,
  PRIMARY KEY (date,kid_id)
);
CREATE INDEX club_attendance_kid ON club_attendance(kid_id);
CREATE TABLE club_attendance_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL REFERENCES club_training(date),
  kid_id uuid NOT NULL REFERENCES club_kid(id) ON DELETE CASCADE,
  present boolean NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  recorded_by text NOT NULL
);
CREATE INDEX club_attendance_event_session ON club_attendance_event(date,recorded_at);

-- Snapshot eligible units on the receipt, so future catalogue edits do not
-- change earned points. Existing receipts are classified once at migration.
ALTER TABLE "OrderItem" ADD COLUMN "granolaBags" integer NOT NULL DEFAULT 0 CHECK ("granolaBags" >= 0 AND "granolaBags" <= quantity);
UPDATE "OrderItem" i SET "granolaBags"=i.quantity FROM "Product" p
WHERE p.id=i."productId" AND p.category='GRANOLA';

-- Derive awards from the source records. Repeated check-ins, payment requests,
-- judges and heats cannot duplicate points; undo/cancellation reverses them.
CREATE VIEW club_point_activity AS
SELECT a.kid_id,'training'::text AS kind,a.date::text AS source_id,
  a.date::text AS activity_date,t.points::integer AS points,1::integer AS units
FROM club_attendance a JOIN club_training t ON t.date=a.date WHERE a.present
UNION ALL
SELECT f.kid_id,'granola',o.id,
  ((o."paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Indian/Mauritius')::date::text,
  (bags.units*r.granola)::integer,bags.units::integer
FROM "Order" o JOIN club_order_family f ON f.order_id=o.id
JOIN LATERAL (SELECT sum("granolaBags") AS units FROM "OrderItem" WHERE "orderId"=o.id) bags ON bags.units>0
JOIN LATERAL (SELECT granola FROM club_point_rule WHERE effective_at<=o."paidAt" AT TIME ZONE 'UTC' ORDER BY effective_at DESC,id DESC LIMIT 1) r ON true
WHERE o."paidAt" IS NOT NULL AND o.status<>'CANCELLED'
UNION ALL
SELECT participation.kid_id,'cup',participation.edition,
  (participation.first_run AT TIME ZONE 'Indian/Mauritius')::date::text,r.cup,1
FROM (SELECT w.kid_id,h.edition,min(w.created_at) AS first_run FROM cup_wave w JOIN cup_heat h ON h.id=w.heat_id GROUP BY w.kid_id,h.edition) participation
JOIN LATERAL (SELECT cup FROM club_point_rule WHERE effective_at<=participation.first_run ORDER BY effective_at DESC,id DESC LIMIT 1) r ON true;

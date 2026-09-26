-- Sunrise Duckies: an early session alongside the evening Sunset Duckies
-- training, worth fewer points. club_training/club_attendance/
-- club_attendance_event gain a session_type so both sessions can be rolled
-- on the same date; existing rows are all Sunset Duckies.
ALTER TABLE club_point_rule ADD COLUMN sunrise integer NOT NULL DEFAULT 5 CHECK (sunrise BETWEEN 0 AND 1000);

ALTER TABLE club_training ADD COLUMN session_type text NOT NULL DEFAULT 'sunset' CHECK (session_type IN ('sunset','sunrise'));
ALTER TABLE club_attendance ADD COLUMN session_type text NOT NULL DEFAULT 'sunset' CHECK (session_type IN ('sunset','sunrise'));
ALTER TABLE club_attendance_event ADD COLUMN session_type text NOT NULL DEFAULT 'sunset' CHECK (session_type IN ('sunset','sunrise'));

-- The child FKs referenced club_training(date) alone; that stops being
-- unique once the primary key grows to (date,session_type).
ALTER TABLE club_attendance DROP CONSTRAINT club_attendance_date_fkey;
ALTER TABLE club_attendance_event DROP CONSTRAINT club_attendance_event_date_fkey;

ALTER TABLE club_training DROP CONSTRAINT club_training_pkey;
ALTER TABLE club_training ADD PRIMARY KEY (date,session_type);

ALTER TABLE club_attendance DROP CONSTRAINT club_attendance_pkey;
ALTER TABLE club_attendance ADD PRIMARY KEY (date,session_type,kid_id);

ALTER TABLE club_attendance ADD CONSTRAINT club_attendance_session_fkey FOREIGN KEY (date,session_type) REFERENCES club_training(date,session_type);
ALTER TABLE club_attendance_event ADD CONSTRAINT club_attendance_event_session_fkey FOREIGN KEY (date,session_type) REFERENCES club_training(date,session_type);

DROP INDEX club_attendance_event_session;
CREATE INDEX club_attendance_event_session ON club_attendance_event(date,session_type,recorded_at);

-- Sunset training's own point-activity source_id was the bare date; a kid
-- can now earn a training award twice on the same date (sunset and
-- sunrise), so it needs the session type to stay unique. session_type
-- itself is appended so existing view columns keep their position.
CREATE OR REPLACE VIEW club_point_activity AS
SELECT a.kid_id,'training'::text AS kind,a.date::text||':'||a.session_type AS source_id,
  a.date::text AS activity_date,t.points::integer AS points,1::integer AS units,a.session_type::text AS session_type
FROM club_attendance a JOIN club_training t ON t.date=a.date AND t.session_type=a.session_type WHERE a.present
UNION ALL
SELECT f.kid_id,'granola',o.id,
  ((o."paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Indian/Mauritius')::date::text,
  (bags.units*r.granola)::integer,bags.units::integer,NULL::text
FROM "Order" o JOIN club_order_family f ON f.order_id=o.id
JOIN LATERAL (SELECT sum("granolaBags") AS units FROM "OrderItem" WHERE "orderId"=o.id) bags ON bags.units>0
JOIN LATERAL (SELECT granola FROM club_point_rule WHERE effective_at<=o."paidAt" AT TIME ZONE 'UTC' ORDER BY effective_at DESC,id DESC LIMIT 1) r ON true
WHERE o."paidAt" IS NOT NULL AND o.status<>'CANCELLED'
UNION ALL
SELECT participation.kid_id,'cup',participation.edition,
  (participation.first_run AT TIME ZONE 'Indian/Mauritius')::date::text,r.cup,1,NULL::text
FROM (SELECT w.kid_id,h.edition,min(w.created_at) AS first_run FROM cup_wave w JOIN cup_heat h ON h.id=w.heat_id GROUP BY w.kid_id,h.edition) participation
JOIN LATERAL (SELECT cup FROM club_point_rule WHERE effective_at<=participation.first_run ORDER BY effective_at DESC,id DESC LIMIT 1) r ON true;

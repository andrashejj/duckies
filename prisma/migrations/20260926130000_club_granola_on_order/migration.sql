-- Granola points now award as soon as a reservation with granola bags is
-- placed, not when an organiser later marks the order paid: a family sees
-- the credit immediately, and it disappears if the order is cancelled (the
-- view recomputes live, same as training and Cup already do). This also
-- means any order still pending starts earning points the moment this
-- ships, and the rate for an already-paid order is now looked up by when
-- it was placed rather than when it was paid.
CREATE OR REPLACE VIEW club_point_activity AS
SELECT a.kid_id,'training'::text AS kind,a.date::text||':'||a.session_type AS source_id,
  a.date::text AS activity_date,t.points::integer AS points,1::integer AS units,a.session_type::text AS session_type
FROM club_attendance a JOIN club_training t ON t.date=a.date AND t.session_type=a.session_type WHERE a.present
UNION ALL
SELECT f.kid_id,'granola',o.id,
  ((o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Indian/Mauritius')::date::text,
  (bags.units*r.granola)::integer,bags.units::integer,NULL::text
FROM "Order" o JOIN club_order_family f ON f.order_id=o.id
JOIN LATERAL (SELECT sum("granolaBags") AS units FROM "OrderItem" WHERE "orderId"=o.id) bags ON bags.units>0
JOIN LATERAL (SELECT granola FROM club_point_rule WHERE effective_at<=o."createdAt" AT TIME ZONE 'UTC' ORDER BY effective_at DESC,id DESC LIMIT 1) r ON true
WHERE o.status<>'CANCELLED'
UNION ALL
SELECT participation.kid_id,'cup',participation.edition,
  (participation.first_run AT TIME ZONE 'Indian/Mauritius')::date::text,r.cup,1,NULL::text
FROM (SELECT w.kid_id,h.edition,min(w.created_at) AS first_run FROM cup_wave w JOIN cup_heat h ON h.id=w.heat_id GROUP BY w.kid_id,h.edition) participation
JOIN LATERAL (SELECT cup FROM club_point_rule WHERE effective_at<=participation.first_run ORDER BY effective_at DESC,id DESC LIMIT 1) r ON true;

-- Ease the per-bag rate slightly; the other rates carry forward unchanged.
INSERT INTO club_point_rule(training,sunrise,granola,cup,recorded_by)
SELECT training,sunrise,4,cup,'migration' FROM club_point_rule ORDER BY effective_at DESC,id DESC LIMIT 1;

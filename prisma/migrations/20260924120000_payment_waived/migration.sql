-- A third payment status: no payment needed. Andras records it when the club
-- waives a fee (a semester, or a Cup entry) — in the lineup that kid is a
-- wildcard. Like any payment it is an event, so the history keeps who and when.
ALTER TABLE club_payment_event DROP CONSTRAINT club_payment_event_status_check;
ALTER TABLE club_payment_event ADD CONSTRAINT club_payment_event_status_check
  CHECK (status IN ('paid', 'unpaid', 'waived'));

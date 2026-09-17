-- Cup Vol. 02 moves from the 17/18 October weekend to Friday 16 October.
-- Mirrors the seed change in src/data/plan-tasks.ts for databases that were
-- seeded before it. Rows are matched by their positional seed ids; status and
-- owner are left alone, versions bump so an open board reloads.

UPDATE plan_milestone SET date_label = 'Thu 15 Oct', due_on = '2026-10-15' WHERE id = 'produce';
UPDATE plan_milestone SET date_label = 'Thu 15 Oct', due_on = '2026-10-15' WHERE id = 'buzz';
UPDATE plan_milestone SET date_label = 'Fri 16 Oct', due_on = '2026-10-16' WHERE id = 'event';

UPDATE plan_task SET text = 'Confirm the kitchen for Wed 30 Sep, Wed 7 Oct and Wed 14 – Thu 15 Oct. Scales, trays and airtight containers are in it.',
  version = version + 1, updated_at = now(), updated_by = 'migration' WHERE id = 'produce-1';
UPDATE plan_task SET due_on = '2026-10-15', version = version + 1, updated_at = now(), updated_by = 'migration' WHERE id IN ('produce-6', 'produce-7', 'buzz-7');

UPDATE plan_task SET text = 'Save-the-date to the parents WhatsApp group: Cup Vol. 02 on Friday 16 October, and “we are also cooking something for the day”.',
  version = version + 1, updated_at = now(), updated_by = 'migration' WHERE id = 'buzz-1';

UPDATE plan_task SET text = 'Confirm Friday 16 October with the coach: the Cup replaces that day''s training.',
  version = version + 1, updated_at = now(), updated_by = 'migration' WHERE id = 'event-1';
UPDATE plan_task SET text = 'Brief the judges and the setup crew at Monday training. Send the reminder on Thursday: time, what to bring, parents stay.',
  due_on = '2026-10-15', version = version + 1, updated_at = now(), updated_by = 'migration' WHERE id = 'event-10';
UPDATE plan_task SET due_on = '2026-10-16', version = version + 1, updated_at = now(), updated_by = 'migration' WHERE id IN ('event-11', 'event-12', 'event-13');
UPDATE plan_task SET due_on = '2026-10-17', version = version + 1, updated_at = now(), updated_by = 'migration' WHERE id = 'event-14';
UPDATE plan_task SET due_on = '2026-10-18', version = version + 1, updated_at = now(), updated_by = 'migration' WHERE id = 'event-15';

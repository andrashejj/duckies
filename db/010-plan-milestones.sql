-- Project Molt plan, second cut: seven milestones (recipe, design, packaging,
-- produce, buzz, event, partners), each with one due date, instead of dated
-- phases, an onsite track and a list of hard dates. The old rows and their
-- status events are cleared; the next approved read seeds the new plan from
-- src/data/plan-tasks.ts.
DELETE FROM plan_task_event;
DELETE FROM plan_task;
DELETE FROM plan_milestone;
ALTER TABLE plan_milestone DROP COLUMN track, DROP COLUMN starts_on;
ALTER TABLE plan_milestone RENAME COLUMN ends_on TO due_on;

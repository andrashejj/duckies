-- Project Molt plan: a review step between doing and done (Estelle does the
-- work and moves it to review; Dori signs it off), and the tasks re-owned to
-- match: Estelle does the work, Dori decides, Andras carries none. Generated
-- from src/data/plan-tasks.ts. Live rows are updated in place so statuses
-- moved on the board are kept; tasks the seed added are inserted. On a
-- database that has not been seeded yet both are no-ops and the seed applies.
ALTER TABLE plan_task DROP CONSTRAINT plan_task_status_check;
ALTER TABLE plan_task ADD CONSTRAINT plan_task_status_check CHECK (status IN ('todo','doing','review','done'));

UPDATE plan_milestone AS m SET owner_id = v.owner_id
FROM (VALUES
  ('design', 'dori'),
  ('recipe', 'estelle'),
  ('packaging', 'estelle'),
  ('partners', 'estelle'),
  ('produce', 'estelle'),
  ('buzz', 'estelle'),
  ('event', 'estelle')
) AS v(id, owner_id)
WHERE m.id = v.id AND m.owner_id IS DISTINCT FROM v.owner_id;

CREATE TEMP TABLE plan_seed(id text, milestone_id text, text text, owner_id text, due_on date, sort integer) ON COMMIT DROP;
INSERT INTO plan_seed VALUES
  ('design-1', 'design', 'Draft design: three directions for the name, the logo lockup and the colours on the bag.', 'estelle', '2026-09-25'::date, 0),
  ('design-2', 'design', 'Draft the label text with everything the law and the shops need: ingredients, allergens, net weight, dates, made in Tamarin. No health claim the recipe cannot back up.', 'estelle', '2026-09-29'::date, 1),
  ('design-3', 'design', 'Show the label to three people outside the club with the product clarity check. Fix the wording.', 'estelle', '2026-10-01'::date, 2),
  ('design-4', 'design', 'Send the print-ready label to the printer with the pouch order.', 'estelle', '2026-10-02'::date, 3),
  ('design-5', 'design', 'Final design: pick a direction from Estelle''s drafts and finish the print-ready label.', 'dori', '2026-10-01'::date, 4),
  ('recipe-1', 'recipe', 'Lock the ingredient list, bag weight and product name from the starter mix in the granola sheet. The list goes on the label and cannot change after this.', 'estelle', '2026-09-28'::date, 0),
  ('recipe-2', 'recipe', 'First bake. Weigh the cooled yield, time every step, enter the actuals and the receipts in the granola sheet.', 'estelle', '2026-09-30'::date, 1),
  ('recipe-3', 'recipe', 'Founding families taste it at Friday training. Write down what they would change.', 'estelle', '2026-10-02'::date, 2),
  ('recipe-4', 'recipe', 'Second bake with tuned quantities. Save the final recipe as a version in the sheet.', 'estelle', '2026-10-07'::date, 3),
  ('recipe-5', 'recipe', 'Business case v1: every allowance replaced by a receipt or a quote, a proposed price and a first-batch quantity.', 'estelle', '2026-10-09'::date, 4),
  ('packaging-1', 'packaging', 'Reach out to two or three suppliers for quotes on stock stand-up pouches and printed labels: price, minimum order, lead time.', 'estelle', '2026-09-23'::date, 0),
  ('packaging-2', 'packaging', 'Choose the packaging provider from Estelle''s quotes. Custom-printed pouches are out for this batch: four to eight weeks plus shipping.', 'dori', '2026-09-25'::date, 1),
  ('packaging-3', 'packaging', 'Place the pouch and label order.', 'estelle', '2026-10-02'::date, 2),
  ('packaging-4', 'packaging', 'Check every pouch and label on delivery. If the printer slips, fall back to plain pouches with home-printed labels. The Cup does not move.', 'estelle', '2026-10-09'::date, 3),
  ('partners-1', 'partners', 'List six to eight shops in Tamarin, La Preneuse and Black River, and write a short intro message to send them.', 'estelle', '2026-09-28'::date, 0),
  ('partners-2', 'partners', 'Introduce Estelle to the shops you know.', 'abiguelle', '2026-10-06'::date, 1),
  ('partners-3', 'partners', 'Six shop visits with the shop sheet: would they stock it, at what margin, what the label needs, minimum order, delivery. Do not sell yet.', 'estelle', '2026-10-06'::date, 2),
  ('partners-4', 'partners', 'Follow up. Confirm which one or two take a trial after the Cup, and on what terms.', 'estelle', '2026-10-13'::date, 3),
  ('partners-5', 'partners', 'Agree the trial terms and the first delivery date with each shop.', 'dori', '2026-10-20'::date, 4),
  ('produce-1', 'produce', 'Confirm the kitchen for Wed 30 Sep, Wed 7 Oct and Thu 15 – Fri 16 Oct. Scales, trays and airtight containers are in it.', 'estelle', '2026-09-28'::date, 0),
  ('produce-2', 'produce', 'Check which food-handling or hygiene rule applies to selling a home-baked product at a club event.', 'estelle', '2026-09-25'::date, 1),
  ('produce-3', 'produce', 'Agree the price and the first-batch quantity from business case v1: how many bags to sell, how many to give away as tastings.', 'dori', '2026-10-09'::date, 2),
  ('produce-4', 'produce', 'Go / no-go: pouches, labels, ingredients, kitchen and helpers all confirmed.', 'dori', '2026-10-12'::date, 3),
  ('produce-5', 'produce', 'Buy all first-batch ingredients. Every receipt photographed into the sheet.', 'estelle', '2026-10-12'::date, 4),
  ('produce-6', 'produce', 'Bake and pack the first batch. Number the bags. Record ingredients, time and cost per bag.', 'estelle', '2026-10-16'::date, 5),
  ('produce-7', 'produce', 'Second pair of hands on the bake and the packing.', 'abiguelle', '2026-10-16'::date, 6),
  ('buzz-1', 'buzz', 'Save-the-date to the parents WhatsApp group: Cup Vol. 02 on 17/18 October, and “we are also cooking something for the day”.', 'dori', '2026-09-18'::date, 0),
  ('buzz-2', 'buzz', 'Instagram account live. Agree who posts.', 'estelle', '2026-09-18'::date, 1),
  ('buzz-3', 'buzz', 'Photo permission forms back from every family whose kid may appear on Instagram or the Cup pages.', 'estelle', '2026-10-02'::date, 2),
  ('buzz-4', 'buzz', 'Teaser 1: something is in the oven. Test-bake shots, no name, no pack.', 'estelle', '2026-10-02'::date, 3),
  ('buzz-5', 'buzz', 'Teaser 2: the maker story. Who bakes it, what goes in, why.', 'estelle', '2026-10-09'::date, 4),
  ('buzz-6', 'buzz', 'Fifteen conversations with people outside the club: the beach, cafés, school pickup. Record price objections, not compliments. Ten names on the pre-order list.', 'estelle', '2026-10-11'::date, 5),
  ('buzz-7', 'buzz', 'Countdown week: schedule post, packaging sneak peek, “first batch reveal at the Cup”.', 'estelle', '2026-10-16'::date, 6),
  ('event-1', 'event', 'Pick the Cup day: Saturday 17 or Sunday 18 October.', 'dori', '2026-09-18'::date, 0),
  ('event-2', 'event', 'Open registration. Confirm the coach for water marshals and the earlier start.', 'dori', '2026-09-25'::date, 1),
  ('event-3', 'event', 'Turn the Vol. 01 checklist into the Vol. 02 one, with the nine lessons added, an owner and a date on every row.', 'estelle', '2026-10-01'::date, 2),
  ('event-4', 'event', 'Volunteers on the sand at Friday training: setup, BBQ, judges, media, side activities. Three judges and the paid food stall confirmed.', 'estelle', '2026-10-07'::date, 3),
  ('event-5', 'event', 'Kit check: gazebos, rashies by colour, tables, sound, first aid. Borrow or buy what is missing.', 'estelle', '2026-10-07'::date, 4),
  ('event-6', 'event', 'Close registration. Tally names, divisions and rashie sizes. Draft the heat draw.', 'estelle', '2026-10-09'::date, 5),
  ('event-7', 'event', 'Sign off the heat draw and the safety plan.', 'dori', '2026-10-12'::date, 6),
  ('event-8', 'event', 'Print scorecards, run of show, heat tags and certificates. Pack rashies, markers and prize bags.', 'estelle', '2026-10-14'::date, 7),
  ('event-9', 'event', 'Stall ready: packing station, numbered labels, price sign, cash float, pre-order form.', 'estelle', '2026-10-14'::date, 8),
  ('event-10', 'event', 'Brief the judges and the setup crew at Friday training. Send the reminder: time, what to bring, parents stay.', 'estelle', '2026-10-16'::date, 9),
  ('event-11', 'event', 'Run the desk and the run of show on the day.', 'estelle', '2026-10-17'::date, 10),
  ('event-12', 'event', 'Run the granola stall and the tally: bags sold, pre-orders, refusals and the reasons.', 'abiguelle', '2026-10-17'::date, 11),
  ('event-13', 'event', 'MC the day. Reveal the granola before the crowns.', 'dori', '2026-10-17'::date, 12),
  ('event-14', 'event', 'Results and thank-you on WhatsApp and Instagram, with the pre-order form for batch two.', 'estelle', '2026-10-18'::date, 13),
  ('event-15', 'event', 'The 48-hour report: bags sold, pre-orders, refusals, what people said.', 'estelle', '2026-10-20'::date, 14);

UPDATE plan_task AS t SET text = s.text, owner_id = s.owner_id, due_on = s.due_on, updated_at = now(), updated_by = 'seed'
FROM plan_seed AS s
WHERE t.id = s.id AND (t.text <> s.text OR t.owner_id IS DISTINCT FROM s.owner_id OR t.due_on IS DISTINCT FROM s.due_on);

INSERT INTO plan_task (id, milestone_id, text, owner_id, due_on, sort)
SELECT s.id, s.milestone_id, s.text, s.owner_id, s.due_on, s.sort
FROM plan_seed AS s
WHERE EXISTS (SELECT 1 FROM plan_milestone m WHERE m.id = s.milestone_id)
  AND NOT EXISTS (SELECT 1 FROM plan_task t WHERE t.id = s.id);

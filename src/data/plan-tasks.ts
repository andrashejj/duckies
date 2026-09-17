import type { PlanLink } from "../lib/plan";

// Seed for the Project Molt plan tables (db/009-plan-board.sql, reshaped by
// 010-plan-milestones.sql). Loaded into plan_person / plan_milestone /
// plan_task the first time the plan is read from an empty database; after
// that the database is the record and this file is history.
//
// Seven milestones, one due date each, listed in the order they fall due. Every task
// has an owner: andras (remote until Fri 16 Oct), estelle (onsite 29 Sep –
// 19 Oct), abiguelle (three fixed moments), dori (no tasks yet).

export type SeedTask = { text: string; owner: string | null; due: string | null };
export type SeedMilestone = {
  id: string; code: string; title: string; dateLabel: string; dueOn: string;
  deliverable: string; owner: string | null; links?: PlanLink[]; tasks: SeedTask[];
};

export const planPeople = [
  { id: "andras", name: "Andras", email: "andras@hejj.xyz" },
  { id: "estelle", name: "Estelle", email: "niki.este.2022@ksz.edu-zg.ch" },
  { id: "abiguelle", name: "Abiguelle", email: null },
  { id: "dori", name: "Dori", email: "onody.dora@gmail.com" },
];

const t = (text: string, owner: string | null, due: string | null): SeedTask => ({ text, owner, due });

export const planMilestones: SeedMilestone[] = [
  {
    id: "design", code: "01", title: "Design", dateLabel: "Thu 1 Oct", dueOn: "2026-10-01", owner: "andras",
    deliverable: "A print-ready label: name, logo, ingredients, allergens, net weight, made-on and best-before, made in Tamarin.",
    links: [{ label: "Product clarity check", file: "/templates/brand-stranger-test.html" }],
    tasks: [
      t("Decide the name, the logo lockup and the colours for the bag.", "andras", "2026-09-25"),
      t("Draft the label with everything the law and the shops need: ingredients, allergens, net weight, dates, made in Tamarin. No health claim the recipe cannot back up.", "andras", "2026-09-29"),
      t("Show the label to three people outside the club with the product clarity check. Fix the wording.", "estelle", "2026-10-01"),
      t("Send the print-ready label to the printer.", "andras", "2026-10-01"),
    ],
  },
  {
    id: "recipe", code: "02", title: "Recipe", dateLabel: "Wed 7 Oct", dueOn: "2026-10-07", owner: "estelle",
    deliverable: "A locked recipe with a real cost per bag: ingredient list, quantities, bag weight and name, backed by receipts from two bakes.",
    links: [{ label: "Granola sheet", file: "/branding-plan/business-case" }],
    tasks: [
      t("Lock the ingredient list, bag weight and product name. The list goes on the label and cannot change after this.", "andras", "2026-09-28"),
      t("First bake. Weigh the cooled yield, time every step, enter the actuals and the receipts in the granola sheet.", "estelle", "2026-09-30"),
      t("Founding families taste it at Friday training. Write down what they would change.", "estelle", "2026-10-02"),
      t("Second bake with tuned quantities. Save the final recipe as a version in the sheet.", "estelle", "2026-10-07"),
      t("Business case v1: every allowance replaced by a receipt or a quote, a proposed price and a first-batch quantity.", "estelle", "2026-10-09"),
    ],
  },
  {
    id: "packaging", code: "03", title: "Packaging", dateLabel: "Fri 9 Oct", dueOn: "2026-10-09", owner: "andras",
    deliverable: "Pouches and printed labels in hand, checked, one week before the bake.",
    tasks: [
      t("Quotes from two or three suppliers for stock stand-up pouches and printed labels: price, minimum order, lead time.", "andras", "2026-09-23"),
      t("Decide the packaging provider. Custom-printed pouches are out for this batch: four to eight weeks plus shipping.", "andras", "2026-09-25"),
      t("Place the pouch and label order.", "andras", "2026-10-02"),
      t("Check every pouch and label on delivery. If the printer slips, fall back to plain pouches with home-printed labels. The Cup does not move.", "estelle", "2026-10-09"),
    ],
  },
  {
    id: "partners", code: "04", title: "Partners", dateLabel: "Tue 13 Oct", dueOn: "2026-10-13", owner: "estelle",
    deliverable: "Two shops willing to trial the granola after the Cup, with their terms written down.",
    links: [{ label: "Shop conversations sheet", file: "/templates/brand-shop-conversations.html" }],
    tasks: [
      t("List six to eight shops in Tamarin, La Preneuse and Black River, with a short intro message Estelle can forward.", "andras", "2026-09-28"),
      t("Introduce Estelle to the shops you know.", "abiguelle", "2026-10-06"),
      t("Six shop visits with the shop sheet: would they stock it, at what margin, what the label needs, minimum order, delivery. Do not sell yet.", "estelle", "2026-10-06"),
      t("Follow up. Confirm which one or two take a trial after the Cup, and on what terms.", "estelle", "2026-10-13"),
      t("Agree the trial terms and the first delivery date with each shop.", "andras", "2026-10-20"),
    ],
  },
  {
    id: "produce", code: "05", title: "Produce", dateLabel: "Fri 16 Oct", dueOn: "2026-10-16", owner: "estelle",
    deliverable: "The first batch baked, packed, numbered and counted, with the real cost per bag written down.",
    links: [{ label: "Granola sheet", file: "/branding-plan/business-case" }],
    tasks: [
      t("Confirm the kitchen for Wed 30 Sep, Wed 7 Oct and Thu 15 – Fri 16 Oct. Scales, trays and airtight containers are in it.", "andras", "2026-09-28"),
      t("Check which food-handling or hygiene rule applies to selling a home-baked product at a club event.", "andras", "2026-09-25"),
      t("Set the first-batch quantity and the price from the granola sheet: how many bags to sell, how many to give away as tastings.", "andras", "2026-10-09"),
      t("Go / no-go: pouches, labels, ingredients, kitchen and helpers all confirmed.", "andras", "2026-10-12"),
      t("Buy all first-batch ingredients. Every receipt photographed into the sheet.", "estelle", "2026-10-12"),
      t("Bake and pack the first batch. Number the bags. Record ingredients, time and cost per bag.", "estelle", "2026-10-16"),
      t("Second pair of hands on the bake and the packing.", "abiguelle", "2026-10-16"),
    ],
  },
  {
    id: "buzz", code: "06", title: "Buzz", dateLabel: "Fri 16 Oct", dueOn: "2026-10-16", owner: "estelle",
    deliverable: "Families know the Cup date and that something is coming; ten names on the pre-order list before the reveal.",
    links: [
      { label: "Marketing plan", file: "/branding-plan/marketing" },
      { label: "Photo permission", file: "/templates/brand-photo-permission.html" },
    ],
    tasks: [
      t("Save-the-date to the parents WhatsApp group: Cup Vol. 02 on 17/18 October, and “we are also cooking something for the day”.", "andras", "2026-09-18"),
      t("Instagram account live. Agree who posts.", "andras", "2026-09-18"),
      t("Photo permission forms back from every family whose kid may appear on Instagram or the Cup pages.", "andras", "2026-09-25"),
      t("Teaser 1: something is in the oven. Test-bake shots, no name, no pack.", "estelle", "2026-10-02"),
      t("Teaser 2: the maker story. Who bakes it, what goes in, why.", "estelle", "2026-10-09"),
      t("Fifteen conversations with people outside the club: the beach, cafés, school pickup. Record price objections, not compliments. Ten names on the pre-order list.", "estelle", "2026-10-11"),
      t("Countdown week: schedule post, packaging sneak peek, “first batch reveal at the Cup”.", "estelle", "2026-10-16"),
    ],
  },
  {
    id: "event", code: "07", title: "Event", dateLabel: "Sat 17 / Sun 18 Oct", dueOn: "2026-10-17", owner: "estelle",
    deliverable: "Cup Vol. 02 run on schedule, the granola revealed and sold from the stall, and a report within 48 hours.",
    links: [
      { label: "Vol. 01 pre-event checklist", file: "/templates/pre-event-checklist.html" },
      { label: "Volunteer roles", file: "/templates/volunteer-roles.html" },
      { label: "Run of show", file: "/templates/run-of-show.html" },
      { label: "Cup Vol. 02 page", file: "/sunset-duckies-cup-vol-2" },
    ],
    tasks: [
      t("Pick the Cup day and put it on the Cup Vol. 02 page.", "andras", "2026-09-18"),
      t("Open registration. Confirm the coach for water marshals and the earlier start.", "andras", "2026-09-25"),
      t("Turn the Vol. 01 checklist into the Vol. 02 one, with the nine lessons added, an owner and a date on every row.", "estelle", "2026-10-01"),
      t("Volunteers on the sand at Friday training: setup, BBQ, judges, media, side activities. Three judges and the paid food stall confirmed.", "estelle", "2026-10-07"),
      t("Kit check: gazebos, rashies by colour, tables, sound, first aid. Borrow or buy what is missing.", "estelle", "2026-10-07"),
      t("Close registration. Tally names, divisions and rashie sizes. Draft the heat draw.", "estelle", "2026-10-09"),
      t("Sign off the heat draw and the safety plan.", "andras", "2026-10-12"),
      t("Print scorecards, run of show, heat tags and certificates. Pack rashies, markers and prize bags.", "estelle", "2026-10-14"),
      t("Stall ready: packing station, numbered labels, price sign, cash float, pre-order form.", "estelle", "2026-10-14"),
      t("Brief the judges and the setup crew at Friday training. Send the reminder: time, what to bring, parents stay.", "estelle", "2026-10-16"),
      t("Run the desk and the run of show on the day.", "estelle", "2026-10-17"),
      t("Run the granola stall and the tally: bags sold, pre-orders, refusals and the reasons.", "abiguelle", "2026-10-17"),
      t("MC the day. Reveal the granola before the crowns.", "andras", "2026-10-17"),
      t("Results and thank-you on WhatsApp and Instagram, with the pre-order form for batch two.", "estelle", "2026-10-18"),
      t("The 48-hour report: bags sold, pre-orders, refusals, what people said.", "andras", "2026-10-20"),
    ],
  },
];

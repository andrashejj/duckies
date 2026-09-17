import type { PlanLink, PlanTrack } from "../lib/plan";

// Seed for the Project Molt plan tables (db/009-plan-board.sql). Loaded into
// plan_person / plan_milestone / plan_task the first time the plan is read from
// an empty database; after that the database is the record and this file is
// history. Owners: andras (remote until Fri 16 Oct), estelle (onsite 29 Sep –
// 19 Oct), abiguelle (three fixed moments), dori (signs up; no tasks yet).

export type SeedTask = { text: string; owner: string | null; due: string | null };
export type SeedMilestone = {
  id: string; track: PlanTrack; code: string; title: string; dateLabel: string; startsOn: string; endsOn: string;
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
  // ---------- Phase 1 · countdown to the Cup ----------
  {
    id: "p1-01", track: "phase1", code: "01", title: "Lock the product and the date", dateLabel: "Wed 16 – Fri 18 Sep", startsOn: "2026-09-16", endsOn: "2026-09-18", owner: "andras",
    deliverable: "Product decision record, a confirmed Cup day and the first save-the-date sent.",
    links: [
      { label: "Comparison table", file: "/product-ideas#evaluation" },
      { label: "Save-the-date draft", file: "/templates/cup-vol-2-save-the-date-whatsapp.txt" },
      { label: "Photo permission", file: "/templates/brand-photo-permission.html" },
    ],
    tasks: [
      t("Write the four-product decision record: granola advances, the other three park. Use the interview notes gathered so far; do not wait for the last interview.", "andras", "2026-09-18"),
      t("Pick the Cup day (Sat 17 or Sun 18 Oct), put it on the Cup Vol. 02 page and send the save-the-date to the parents WhatsApp group.", "andras", "2026-09-18"),
      t("Make the Instagram account live (or confirm it) and agree who posts. Send the photo-permission form to families whose kids may appear.", "andras", "2026-09-18"),
    ],
  },
  {
    id: "p1-02", track: "phase1", code: "02", title: "Test bakes and quotes", dateLabel: "Mon 21 – Fri 25 Sep", startsOn: "2026-09-21", endsOn: "2026-09-25", owner: "andras",
    deliverable: "Ingredient list locked on paper, a decided packaging provider, registration open.",
    links: [
      { label: "Granola sheet", file: "/branding-plan/business-case" },
      { label: "Cup Vol. 02 page", file: "/sunset-duckies-cup-vol-2" },
    ],
    tasks: [
      t("Lock the ingredient list on paper from the starter mix in the granola sheet by Monday 28 September. Estelle bakes the quantities when she lands; no test bake is needed before then.", "andras", "2026-09-28"),
      t("Get quotes from two or three suppliers for stock stand-up pouches and printed labels. Confirm price, minimum order and a lead time that lands by Friday 9 October. Decide by Friday 25 September.", "andras", "2026-09-25"),
      t("The kitchen is confirmed. Batch one is baked by Estelle; the paid local maker is a batch-two decision. Check which food-handling or hygiene rule applies to selling a home-baked product at a club event.", "andras", "2026-09-25"),
      t("Open Cup registration and publish the first Instagram save-the-date post.", "andras", "2026-09-25"),
    ],
  },
  {
    id: "p1-03", track: "phase1", code: "03", title: "Lock the recipe, finish the packaging", dateLabel: "Mon 28 Sep – Fri 2 Oct", startsOn: "2026-09-28", endsOn: "2026-10-02", owner: "andras",
    deliverable: "Locked recipe, bag weight and cost per bag; print-ready label; packaging order placed.",
    links: [{ label: "Product clarity check", file: "/templates/brand-stranger-test.html" }],
    tasks: [
      t("Lock the ingredient list, bag weight and product name by Monday 28 September. Estelle lands Tuesday 29 and runs the first bake on Wednesday 30; quantities can still tune until Monday 5 October, the label list cannot.", "andras", "2026-09-28"),
      t("Finish the label by Thursday 1 October: name, ingredients, allergens, net weight, made-on and best-before dates, a made-in-Tamarin line. No health claim the recipe cannot back up.", "andras", "2026-10-01"),
      t("Estelle runs the product clarity check with three people outside the club on Thursday 1 October, before the label goes to print.", "estelle", "2026-10-01"),
      t("Place the pouch and label order on Friday 2 October. Buy the dry ingredients for the first batch at the same time.", "andras", "2026-10-02"),
    ],
  },
  {
    id: "p1-04", track: "phase1", code: "04", title: "Build the buzz", dateLabel: "Mon 5 – Fri 9 Oct", startsOn: "2026-10-05", endsOn: "2026-10-09", owner: "estelle",
    deliverable: "Packaging in hand, launch quantity and price confirmed, heat list drafted.",
    tasks: [
      t("Estelle: six shop visits, the second bake and business case v1 with actual cost per bag by Friday 9 October (see On the ground).", "estelle", "2026-10-09"),
      t("Set the first-batch quantity and the price from the granola sheet. Decide how many bags are for sale and how many are for tasting.", "andras", "2026-10-09"),
      t("Post the maker story: who bakes it, what goes in, why it exists. Tell families on WhatsApp that a limited first batch will be revealed at the Cup.", "estelle", "2026-10-09"),
      t("Check labels and pouches on delivery on Friday 9 October. If the printer slips, fall back to plain pouches with home-printed labels. Do not move the Cup.", "estelle", "2026-10-09"),
    ],
  },
  {
    id: "p1-05", track: "phase1", code: "05", title: "Bake, pack, count down", dateLabel: "Mon 12 – Fri 16 Oct", startsOn: "2026-10-12", endsOn: "2026-10-16", owner: "estelle",
    deliverable: "First batch baked, labelled and counted; Cup schedule published; stall kit packed.",
    tasks: [
      t("Monday 12 October go / no-go: pouches, labels, ingredients, kitchen and helpers all confirmed.", "andras", "2026-10-12"),
      t("Bake and pack on Thursday 15 and Friday 16 October. Number the bags. Record ingredients, time and cost per bag.", "estelle", "2026-10-16"),
      t("Publish the Cup schedule, heats and arrival time on WhatsApp and Instagram. Post the packaging sneak peek and the final countdown.", "estelle", "2026-10-16"),
    ],
  },
  {
    id: "p1-06", track: "phase1", code: "06", title: "Run the Cup, reveal the granola", dateLabel: "Sat 17 / Sun 18 Oct + 48 h", startsOn: "2026-10-17", endsOn: "2026-10-20", owner: "estelle",
    deliverable: "Completed Cup, first batch sold or pre-ordered, 48-hour report.",
    tasks: [
      t("Run the competition with the schedule, roles and safety plan ready before the first heat. Abiguelle runs the granola stall where everyone passes; Estelle runs the desk and the run of show.", "estelle", "2026-10-17"),
      t("Reveal the batch at a visible price. Record bags sold, pre-orders, refusals, questions and what people said.", "abiguelle", "2026-10-17"),
      t("Post the reveal on Instagram during the day, then results and thank-you within 48 hours. Send the pre-order link to the WhatsApp group on Sunday evening.", "estelle", "2026-10-18"),
      t("Write the 48-hour report by Tuesday 20 October.", "andras", "2026-10-20"),
    ],
  },
  {
    id: "p1-07", track: "phase1", code: "07", title: "Close out October", dateLabel: "Mon 19 – Sat 31 Oct", startsOn: "2026-10-19", endsOn: "2026-10-31", owner: "andras",
    deliverable: "Reconciled event and product accounts, second bake for pre-orders, approved November-to-February plan.",
    tasks: [
      t("Reconcile every bag and every event and product cost. Keep product, competition and club money as separate totals.", "andras", "2026-10-31"),
      t("Bake the second batch to fulfil pre-orders. Note what changes in the recipe, label or price.", "andras", "2026-10-31"),
      t("Approve the November-to-February plan by Saturday 31 October.", "andras", "2026-10-31"),
    ],
  },

  // ---------- Estelle onsite · Tue 29 Sep – Mon 19 Oct ----------
  {
    id: "e00", track: "estelle", code: "E00", title: "Before she lands", dateLabel: "By Mon 28 Sep", startsOn: "2026-09-16", endsOn: "2026-09-28", owner: "andras",
    deliverable: "Locked ingredient list, a budget, a shop list, Abiguelle's three dates, the Cup kit and access to the sheet.",
    links: [
      { label: "Vol. 01 pre-event checklist", file: "/templates/pre-event-checklist.html" },
      { label: "Volunteer roles", file: "/templates/volunteer-roles.html" },
      { label: "Run of show", file: "/templates/run-of-show.html" },
    ],
    tasks: [
      t("Lock the ingredient list on paper from the starter mix in the granola sheet. No bake is needed for the list, only for the quantities, and Estelle bakes those on Wednesday 30 September. The list printed on the label cannot change after this.", "andras", "2026-09-28"),
      t("The kitchen is confirmed for Wed 30 Sep, Wed 7 Oct and Thu 15 – Fri 16 Oct. Check scales, trays and airtight containers are in it. Petty cash for ingredients with one rule: every receipt is kept and photographed.", "andras", "2026-09-28"),
      t("Branding access on the site, the granola sheet, the label draft, the photo-permission forms, and a list of six to eight shops in Tamarin, La Preneuse and Black River with a short intro message Estelle can forward.", "andras", "2026-09-28"),
      t("Abiguelle's three moments agreed and in her calendar: shop introductions on Mon 5 – Tue 6 Oct, the first-batch bake on Thu 15 – Fri 16, the stall on Sat 17 / Sun 18.", "andras", "2026-09-28"),
      t("Cup: the day is chosen, registration is open (Fri 25 Sep) and the coach is confirmed for water marshals and the earlier start. Estelle takes over the registration list on arrival.", "andras", "2026-09-25"),
      t("Estelle added to the parents WhatsApp group with a two-line intro from Andras, as the person organising the Cup and the granola.", "andras", "2026-09-28"),
    ],
  },
  {
    id: "e01", track: "estelle", code: "E01", title: "Week 1 · Land, bake, first taste", dateLabel: "Tue 29 Sep – Sun 4 Oct", startsOn: "2026-09-29", endsOn: "2026-10-04", owner: "estelle",
    deliverable: "First bake with real yield, time and receipts in the sheet; label sent to print; first family tasting done; Vol. 02 checklist with an owner and a date on every row.",
    tasks: [
      t("Tue 29: land, meet Abiguelle, walk Tamarin, see the kitchen, shop the locked ingredient list. Receipts into the sheet the same evening.", "estelle", "2026-09-29"),
      t("Wed 30: first bake, alone. Weigh the cooled yield, time every step, enter the actuals. Photograph the bake for the maker story. Ten minutes with Andras in the evening.", "estelle", "2026-09-30"),
      t("Thu 1: read the label draft against the actual ingredients and weight, then show it to three strangers with the product clarity check. Fix the wording before Friday's print.", "estelle", "2026-10-01"),
      t("Thu 1 afternoon: turn the Vol. 01 checklist into the Vol. 02 one, with the nine lessons added as rows, an owner and a date on each.", "estelle", "2026-10-01"),
      t("Fri 2: order placed. Training 4–6 pm: founding families taste, Estelle collects quotes, photo permissions and the first names for the pre-order list. Volunteer sheet on the sand: setup, BBQ, judges, media, side activities.", "estelle", "2026-10-02"),
      t("Sat 3 / Sun 4: Tamarin Bay at the weekend. Five customer conversations with surfers and families outside the club.", "estelle", "2026-10-04"),
    ],
  },
  {
    id: "e02", track: "estelle", code: "E02", title: "Week 2 · Shops, customers, the numbers", dateLabel: "Mon 5 – Sun 11 Oct", startsOn: "2026-10-05", endsOn: "2026-10-11", owner: "estelle",
    deliverable: "Business case v1 with actuals, a proposed price and first-batch quantity, six shop conversations logged, packaging checked; Cup registration closed, kit confirmed, heat draw drafted.",
    links: [{ label: "Shop conversations sheet", file: "/templates/brand-shop-conversations.html" }],
    tasks: [
      t("Mon 5 + Tue 6: six shop visits. Abiguelle introduces the ones she knows, the rest open with Andras's message. Use the shop sheet: would they stock it, at what margin, what they need on the label, minimum order, delivery. Do not sell yet.", "estelle", "2026-10-06"),
      t("Mon 5 + Tue 6: introduce Estelle to the shops you know in Tamarin, La Preneuse and Black River.", "abiguelle", "2026-10-06"),
      t("Wed 7: second bake, tuning quantities only. Update cost per bag with the packaging quote and the paid time. Save two scenarios in the sheet: small batch, bigger batch.", "estelle", "2026-10-07"),
      t("Wed 7: Cup kit check: gazebos, rashies by colour, tables, sound, first-aid kit, what exists from Vol. 01 and what to borrow or buy. Confirm three judges and the paid food stall.", "estelle", "2026-10-07"),
      t("Thu 8: five more customer conversations at cafés and school pickup. Write the price and quantity proposal.", "estelle", "2026-10-08"),
      t("Fri 9: packaging arrives; check every pouch and label. Training 4–6 pm: second tasting with the locked recipe, the pre-order list grows. Registration closes: tally names, divisions and rashie sizes.", "estelle", "2026-10-09"),
      t("Fri 9: send business case v1 and the draft heat draw to Andras for the weekend.", "estelle", "2026-10-09"),
      t("Sat 10 / Sun 11: rest. Five more conversations at the beach if there is energy for it.", "estelle", "2026-10-11"),
    ],
  },
  {
    id: "e03", track: "estelle", code: "E03", title: "Week 3 · Go / no-go, first batch, the Cup", dateLabel: "Mon 12 – Sun 18 Oct", startsOn: "2026-10-12", endsOn: "2026-10-18", owner: "estelle",
    deliverable: "First batch baked, numbered and priced; the Cup printed, packed, briefed and run on schedule; every sale and refusal recorded.",
    tasks: [
      t("Mon 12: go / no-go call with Andras, heat draw signed off. Buy all first-batch ingredients. Training 4–6 pm: Cup schedule and heats go out on WhatsApp and the Cup page.", "estelle", "2026-10-12"),
      t("Tue 13: shop follow-ups. Confirm which one or two take a trial after the Cup and on what terms.", "estelle", "2026-10-13"),
      t("Wed 14: print scorecards, judge briefing, run of show, heat tags and certificates. Pack rashies, markers and prize bags.", "estelle", "2026-10-14"),
      t("Wed 14: the stall: kitchen clean, packing station, labels numbered, price sign, cash float, pre-order form.", "estelle", "2026-10-14"),
      t("Thu 15 + Fri 16: bake and pack the first batch with Abiguelle. Record ingredients, time and cost per bag.", "estelle", "2026-10-16"),
      t("Thu 15 + Fri 16: second pair of hands on the first-batch bake and the packing.", "abiguelle", "2026-10-16"),
      t("Fri 16 training: judges briefed, setup crew confirmed, reminder sent (time, what to bring, parents stay), desk and stall rehearsed.", "estelle", "2026-10-16"),
      t("Sat 17 / Sun 18: run the desk and the run of show. Andras is MC and reveals the granola before the crowns; the media volunteer holds the camera.", "estelle", "2026-10-17"),
      t("Sat 17 / Sun 18: run the granola stall and the tally of bags sold, pre-orders, refusals and reasons.", "abiguelle", "2026-10-17"),
    ],
  },
  {
    id: "e04", track: "estelle", code: "E04", title: "Handover", dateLabel: "Sun 18 – Mon 19 Oct", startsOn: "2026-10-18", endsOn: "2026-10-19", owner: "estelle",
    deliverable: "Everything Andras needs for the 48-hour report and the second bake.",
    tasks: [
      t("Sunday evening: stall tally and pre-order list photographed; cash counted with Andras.", "estelle", "2026-10-18"),
      t("Monday 19: one hour with Andras. Hand over the sheet, the customer and shop logs, the shop contacts with next steps, three things to change for batch two, and the Vol. 02 checklist marked up for Vol. 03.", "estelle", "2026-10-19"),
      t("Estelle writes her own five-line verdict: does this product deserve a second cycle?", "estelle", "2026-10-19"),
    ],
  },

  // ---------- Hard dates · working back from Sat 17 Oct ----------
  { id: "d-cup", track: "dates", code: "17.10", title: "Cup Vol. 02 + granola go-live", dateLabel: "Sat 17 / Sun 18 Oct", startsOn: "2026-10-17", endsOn: "2026-10-18", owner: "estelle", deliverable: "The fixed point. Everything below is set so this day does not move.", tasks: [] },
  { id: "d-bake", track: "dates", code: "15.10", title: "Bake and pack the first batch", dateLabel: "Thu 15 – Fri 16 Oct", startsOn: "2026-10-15", endsOn: "2026-10-16", owner: "estelle", deliverable: "Fresh for the weekend, with one spare day if the oven or the helpers fall through.", tasks: [] },
  { id: "d-gonogo", track: "dates", code: "12.10", title: "Go / no-go", dateLabel: "Mon 12 Oct", startsOn: "2026-10-12", endsOn: "2026-10-12", owner: "andras", deliverable: "Last day to switch to plain pouches and home-printed labels without touching the Cup.", tasks: [] },
  { id: "d-packaging-in", track: "dates", code: "09.10", title: "Pouches and labels in hand", dateLabel: "Fri 9 Oct", startsOn: "2026-10-09", endsOn: "2026-10-09", owner: "estelle", deliverable: "One week of buffer before the bake.", tasks: [] },
  { id: "d-order", track: "dates", code: "02.10", title: "Packaging order placed", dateLabel: "Fri 2 Oct", startsOn: "2026-10-02", endsOn: "2026-10-02", owner: "andras", deliverable: "Assumes about one week for printed labels. Confirm the lead time in the quote; if it is longer, this date moves earlier.", tasks: [] },
  { id: "d-design", track: "dates", code: "01.10", title: "Packaging design finished, print-ready", dateLabel: "Thu 1 Oct", startsOn: "2026-10-01", endsOn: "2026-10-01", owner: "andras", deliverable: "The label needs the locked recipe, bag weight and name.", tasks: [] },
  { id: "d-recipe", track: "dates", code: "28.09", title: "Ingredient list, bag weight and name locked", dateLabel: "Mon 28 Sep", startsOn: "2026-09-28", endsOn: "2026-09-28", owner: "andras", deliverable: "Ingredients and allergens go on the label. Locked before Estelle lands on 29 Sep; quantities can still tune until 5 Oct.", tasks: [] },
  { id: "d-provider", track: "dates", code: "25.09", title: "Packaging provider decided", dateLabel: "Fri 25 Sep", startsOn: "2026-09-25", endsOn: "2026-09-25", owner: "andras", deliverable: "Needs quotes back by Wednesday 23 September.", tasks: [] },
  { id: "d-kickoff", track: "dates", code: "18.09", title: "Granola confirmed, Cup day chosen, save-the-date sent", dateLabel: "Fri 18 Sep", startsOn: "2026-09-18", endsOn: "2026-09-18", owner: "andras", deliverable: "Four weeks of promotion need the date out this week.", tasks: [] },
];

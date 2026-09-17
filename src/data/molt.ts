// Project Molt: the copy behind the branding workspace pages
// (/branding-plan/*). Plan milestones and tasks live in plan-tasks.ts and
// the database; this file holds the parts that do not change week to week.

export const molt = {
  name: "Project Molt",
  span: "Sep 2026 – Feb 2027",
  summary:
    "Sunset Duckies is becoming a surf brand. The first product is a granola made in Tamarin. It goes on sale at Cup Vol. 02 on 17/18 October. By 28 February we decide whether the model can go to a second community.",
  dates: [
    { code: "NOW", label: "Lock the recipe" },
    { code: "17.10", label: "Cup + first batch" },
    { code: "28.02", label: "Rollout decision" },
  ],
};

// The workspace sections, in reading order. The nav and the overview share it.
export const sections = [
  { href: "/branding-plan", label: "Overview", short: "Overview" },
  { href: "/branding-plan/vision", label: "Vision", short: "Vision" },
  { href: "/branding-plan/plan", label: "Plan", short: "Plan" },
  { href: "/branding-plan/onsite", label: "On the ground", short: "Onsite" },
  { href: "/branding-plan/board", label: "Board", short: "Board" },
  { href: "/branding-plan/deliverables", label: "Deliverables", short: "Docs" },
] as const;

export const deliverables = [
  { href: "/branding-plan/business-case", label: "Recipe & business case", text: "The granola sheet: ingredients, cost per bag, price and the monthly result. Save the version worth testing." },
  { href: "/branding-plan/marketing", label: "Marketing plan", text: "One WhatsApp message and one Instagram post a week until the Cup." },
  { href: "/product-ideas", label: "Product candidates", text: "The four concepts and the nine tests they were compared on. Granola advanced." },
] as const;

// How the phases connect. Each step points at the page that holds the detail.
export const chain = [
  { when: "Now → 18 Oct", title: "Get the granola to the Cup", text: "Lock the recipe, print the label, bake the first batch and sell it at the Cup.", href: "/branding-plan/plan", link: "Plan" },
  { when: "29 Sep → 19 Oct", title: "Estelle in Tamarin", text: "She bakes, costs the bag, talks to customers and shops, and runs the Cup.", href: "/branding-plan/onsite", link: "On the ground" },
  { when: "Nov → Feb", title: "Prove it again", text: "A second batch, repeat orders, real costs, and the work moving into local hands.", href: "/branding-plan/plan#phase-2", link: "Phase 2" },
  { when: "28 Feb", title: "Decide what travels", text: "Club and product structure, and the plan for a second community.", href: "/branding-plan/vision", link: "Vision" },
];

export const endGoal =
  "A surf brand people buy for the product. Made with local communities, paid local work, and a model that can move to another place without copying Tamarin.";

// ---------- Vision ----------
export const visionStatement =
  "Sunset Duckies makes high-quality products for surfers and surf families. They are developed with local communities, create paid local work and give those communities a real role in the brand. Tamarin is the first proof. The model has to grow without turning every community into Tamarin.";

export const projectGoals = [
  { code: "01", name: "Quality first", text: "Surfers choose the product because it is useful and well made, not because of the story behind it." },
  { code: "02", name: "Purpose", text: "Paid local work, and a real role for the community in developing, making and representing the product." },
  { code: "03", name: "Community", text: "Surfers, families, makers and supporters who test, use, recommend and help grow the brand." },
  { code: "04", name: "Growth", text: "Decide what stays shared and what stays local, so the model can travel." },
];

export const openDecision =
  "Do the club and the product business stay one operation, or become two connected ones? Test whether the club story helps people buy, but keep club spending, donations and friendly purchases out of the product result.";

export const method = [
  { name: "Compare fairly", text: "Every product candidate gets the same sheet, the same detail and a provisional price. Interview order rotates." },
  { name: "Watch behaviour", text: "Record choices, refusals, price objections, maker quotes, production limits, sales and repeat orders. Not compliments." },
  { name: "Decide on evidence", text: "Every phase ends with a named deliverable and a continue, revise or stop decision." },
];

export const communitySteps = [
  "Start with an existing local group",
  "Agree roles and the first useful work",
  "Move decisions and assets into local hands",
  "Stay connected through shared brand rules",
];

// ---------- On the ground ----------
export const onsite = {
  dates: "Tue 29 Sep – Mon 19 Oct",
  intro:
    "Estelle is in Tamarin for the whole run-up to the Cup and does the work herself. Abiguelle helps at three fixed moments. Andras guides remotely until Friday 16 October.",
  handover: "She hands over a product, a validated business case, two logs and a Cup that ran on schedule.",
};

export const streams = [
  { code: "A", name: "Cook", target: "2 test bakes · first batch 15–16 Oct", text: "Owns the recipe, the kitchen days, the timing sheet, the receipts and the cost per bag. Abiguelle is the second pair of hands on the first-batch bake." },
  { code: "B", name: "Validate the business case", target: "Business case v1 with actuals · Fri 9 Oct", text: "Replace every allowance in the granola sheet with a receipt, a quote or a measured number. Propose a price and a first-batch quantity." },
  { code: "C", name: "Talk to customers", target: "15 conversations · 10 names on the pre-order list", text: "People outside the club: the beach at the weekend, cafés, school pickup. Record price objections, not compliments." },
  { code: "D", name: "Talk to shops", target: "6 shops · 2 willing to trial after the Cup", text: "Tamarin, La Preneuse and Black River. Learn what they need to stock it; do not sell yet. Abiguelle introduces the shops she knows." },
  { code: "E", name: "Organise the Cup", target: "Vol. 02 checklist owned end to end · rehearsed Fri 16 Oct", text: "Start from the Vol. 01 kit and the nine Vol. 02 lessons. Registrations, volunteers, judges, kit, heat draw, printing, run of show. Andras signs off the heat draw and the safety plan." },
];

export const rhythm = [
  { name: "Andras, remote", text: "Ten minutes on WhatsApp every evening in week one, then a 30-minute call Tuesday and Friday. Anything that costs money or changes the label goes through Andras." },
  { name: "Abiguelle, three moments", text: "Shop introductions, the first-batch bake and the granola stall on Cup day. Estelle does not wait on her in between." },
  { name: "Friday numbers", text: "Sheet updated with actuals, logs photographed, a five-line WhatsApp update to Andras." },
  { name: "Training days", text: "Monday and Friday, 4–6 pm at the beach. Tastings, photo permissions, pre-orders and the maker story all happen there." },
];

// ---------- Plan · Phase 2 and gates ----------
export const pilotSteps = [
  {
    date: "November 2026",
    title: "Improve after the launch",
    deliverable: "Revised product specification, economics and second-cycle plan.",
    tasks: [
      "Start from the October reconciliation: product revenue, product costs, competition costs and club spending stay four separate totals.",
      "Review feedback, failures, price objections and follow-on demand.",
      "Revise the product, price, production process and maker agreement where needed.",
    ],
    links: [{ label: "Brand and community model", file: "/templates/brand-concept.html" }],
  },
  {
    date: "Dec 2026 – Jan 2027",
    title: "Run the second product cycle",
    deliverable: "Second-cycle report and Tamarin handover record.",
    tasks: [
      "Produce and sell, or take orders, on the revised specification and economics.",
      "Track repeat and new customers, quality, returns, production reliability and margin.",
      "Move agreed roles and decisions to local people; record where central help is still needed.",
    ],
    links: [{ label: "Brand and community model", file: "/templates/brand-concept.html" }],
  },
  {
    date: "By 28 Feb 2027",
    title: "Decide the structure and what can travel",
    deliverable: "Club and product operating decision, global rollout plan and a recommendation for the next community.",
    tasks: [
      "Decide whether the club and the product business remain one operation or become two connected ones: shared name and story, who decides what, which money stays separate.",
      "Set the rule for any product contribution to club equipment or activities: a named amount or formula, an approval and separate reporting.",
      "Challenge the Tamarin model with people from at least two potential communities outside Mauritius.",
      "Name the next community, sequence, team, budget, risks and the decisions needed to begin.",
    ],
    links: [{ label: "Brand and community model", file: "/templates/brand-concept.html" }],
  },
];

export const gates = [
  {
    date: "17/18 October 2026",
    title: "Cup run, granola live",
    items: [
      "Four-product decision record (granola advances)",
      "Locked recipe, print-ready label and cost per bag",
      "First batch baked, labelled and counted",
      "Cup promotion and registration record",
      "Cup and reveal report within 48 hours: bags sold, pre-orders, refusals, reasons",
      "By 31 October: reconciled accounts and an approved November-to-February plan",
    ],
  },
  {
    date: "28 February 2027",
    title: "Tamarin pilot complete",
    items: [
      "Two product-cycle reports",
      "Tamarin ownership and handover record",
      "Club and product operating and financial boundary",
      "Actual economics and product standards",
      "Costed global rollout plan",
    ],
  },
];

// ---------- Marketing ----------
export const marketingIntro =
  "One message a week until the Cup. WhatsApp carries logistics and the tastings for club families. Instagram builds up to the reveal and shows nothing of the product before the day. Photo permission before any kid appears anywhere.";

export const commsPlan = [
  { when: "Fri 18 Sep", whatsapp: "Save the date: Cup Vol. 02 on 17/18 October. “We are also cooking something for the day.”", instagram: "Account live. First post: save the date, with a photo from Cup Vol. 01." },
  { when: "Fri 25 Sep", whatsapp: "Registration open. Ask for volunteers: judges, beach marshals, food, the stall.", instagram: "Cup registration post. Photo permissions in hand before any kid appears." },
  { when: "Fri 2 Oct", whatsapp: "Founding families taste the locked recipe at Friday training. Collect quotes for the label and the maker story.", instagram: "Teaser 1: something is in the oven. Test-bake shots, no name, no pack." },
  { when: "Fri 9 Oct", whatsapp: "A limited first batch will be revealed at the Cup. Draft heat list.", instagram: "Teaser 2: the maker story. Who bakes it, what goes in, why." },
  { when: "Mon 12 – Fri 16 Oct", whatsapp: "Final schedule, heats, arrival time, what to bring. Reminder on Friday 16.", instagram: "Countdown: schedule post, packaging sneak peek, “first batch reveal at the Cup”." },
  { when: "Sat 17 / Sun 18 Oct", whatsapp: "Photo of the stall. “Grab your bag, or pre-order here.”", instagram: "Stories live from the beach. Reveal post from the stall with the price and how to get one." },
  { when: "Mon 19 – Tue 20 Oct", whatsapp: "Results, thank you, pre-order form for batch two.", instagram: "Results and thank-you post. How to order the next batch." },
];

// ---------- Worksheets ----------
export const worksheets = [
  { when: "Done · 7 Sep", name: "Product concept sheet", use: "Completed for the four products. Kept for the decision record.", file: "/templates/brand-direction-sheet.html" },
  { when: "Closing · 18 Sep", name: "Parent interview", use: "Buying history and the four-concept comparison. Feeds the decision record.", file: "/templates/brand-parent-questionnaire.html" },
  { when: "Closing · 18 Sep", name: "Kid interview", use: "What kids would use, reject and change. Feeds the test bakes.", file: "/templates/brand-kid-conversations.html" },
  { when: "By 25 Sep", name: "Photo permission", use: "Required before any child appears on Instagram or the Cup pages.", file: "/templates/brand-photo-permission.html" },
  { when: "29 Sep – 11 Oct", name: "Product clarity check", use: "Estelle's fifteen customer conversations, starting with the label check before print.", file: "/templates/brand-stranger-test.html" },
  { when: "1 – 16 Oct", name: "Cup Vol. 01 kit", use: "Pre-event checklist, volunteer roles, run of show, heat schedule, scorecards. Copy and update for Vol. 02.", file: "/templates/pre-event-checklist.html" },
  { when: "5 – 13 Oct", name: "Shop conversations", use: "Estelle's six shop visits: would they stock it, margin, what the label needs, minimum order.", file: "/templates/brand-shop-conversations.html" },
  { when: "Nov – Feb", name: "Brand and community model", use: "Record local ownership, handover, shared rules and rollout decisions.", file: "/templates/brand-concept.html" },
];

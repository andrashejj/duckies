// Project Molt: the copy behind the branding workspace pages
// (/branding-plan/*). Milestones and tasks live in plan-tasks.ts and the
// database; this file holds the parts that do not change week to week.

export const molt = {
  name: "Project Molt",
  span: "Sep 2026 – Feb 2027",
  summary:
    "Sunset Duckies is making its first product: a granola baked in Tamarin, on sale at Cup Vol. 02 on 17/18 October. By 28 February we decide whether it is worth doing again, and whether another club could do the same.",
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

// How the steps connect. Each one points at the page that holds the detail.
export const chain = [
  { when: "Now → 18 Oct", title: "Get the granola to the Cup", text: "Seven milestones: recipe, design, packaging, produce, buzz, the event, and shops to sell it.", href: "/branding-plan/plan", link: "Plan" },
  { when: "29 Sep → 19 Oct", title: "Estelle in Tamarin", text: "She bakes, costs the bag, talks to customers and shops, and runs the Cup.", href: "/branding-plan/onsite", link: "On the ground" },
  { when: "Nov → Feb", title: "Do it again", text: "A second batch, repeat orders, real costs, and local people running it.", href: "/branding-plan/plan#after", link: "After the Cup" },
  { when: "28 Feb", title: "Decide", text: "Keep going or stop, how the club and the product relate, and whether a second club should try it.", href: "/branding-plan/vision", link: "Vision" },
];

export const endGoal =
  "Products people buy because they are good, made in Tamarin by people who are paid for the work. If it works here, another surf club can do the same with its own people and its own product.";

// ---------- Vision ----------
export const visionStatement =
  "Sunset Duckies makes things surfers and surf families actually use. They are made here, the people who make them are paid, and the club has a say in what gets made. Tamarin goes first. If it works, other clubs can do the same in their own way.";

export const projectGoals = [
  { code: "01", name: "Good product", text: "People buy it because it is good, not because they like the club." },
  { code: "02", name: "Paid work", text: "The people who make it are named, paid, and have a say in it." },
  { code: "03", name: "Community", text: "Surfers, families, makers and supporters who use it, recommend it and help." },
  { code: "04", name: "Repeatable", text: "Write down what worked, so a second club can run it without us." },
];

export const openDecision =
  "Do the club and the product stay one operation, or become two connected ones? Find out whether the club story helps people buy, but keep club spending, donations and friendly purchases out of the product's numbers.";

export const method = [
  { name: "Compare fairly", text: "Every product idea got the same sheet, the same detail and a provisional price, and the interviews rotated their order." },
  { name: "Watch what people do", text: "Count choices, refusals, price objections, sales and repeat orders. Compliments do not count." },
  { name: "Decide at each milestone", text: "Each milestone ends with something you can hold, and a decision: go on, change it, or stop." },
];

export const communitySteps = [
  "Start with a club that already exists",
  "Agree who does what, and the first useful job",
  "Hand decisions and equipment to local people",
  "Keep the shared name and a few shared rules",
];

// ---------- On the ground ----------
export const onsite = {
  dates: "Tue 29 Sep – Mon 19 Oct",
  intro:
    "Estelle is in Tamarin for the whole run-up to the Cup and does the work herself. Abiguelle helps at three fixed moments. Andras guides remotely until Friday 16 October.",
  handover: "She leaves behind a product, a costed business case, the customer and shop notes, and a Cup that ran on time.",
};

export const rhythm = [
  { name: "Andras, remote", text: "Ten minutes on WhatsApp every evening in week one, then a 30-minute call Tuesday and Friday. Anything that costs money or changes the label goes through Andras." },
  { name: "Abiguelle, three moments", text: "Shop introductions, the first-batch bake and the granola stall on Cup day. Estelle does not wait on her in between." },
  { name: "Friday numbers", text: "Sheet updated with actuals, logs photographed, a five-line WhatsApp update to Andras." },
  { name: "Training days", text: "Monday and Friday, 4–6 pm at the beach. Tastings, photo permissions, pre-orders and the maker story all happen there." },
];

// ---------- Plan · after the Cup ----------
export const after = [
  { when: "November", title: "Fix what the Cup showed", text: "Recipe, price, label, how it is made. Bake for the pre-orders. Product, competition and club money stay separate totals." },
  { when: "December – January", title: "Second round", text: "Sell again, count repeat buyers, and hand the work to local people. Write down where help from Andras is still needed." },
  { when: "28 February", title: "Decide", text: "Keep going or stop. One operation or two. Whether a second club should try it, and what they would need from us.", link: { label: "Brand and community model", file: "/templates/brand-concept.html" } },
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

import { shop } from "./shop";

export const site = {
  shop,
  name: "Sunset Duckies",
  shortName: "Sunset Duckies",
  url: "https://sunsetduckies.com",
  location: "Tamarin Bay, Mauritius",
  locale: "en_MU",
  description:
    "Kids' surf club in Tamarin Bay. A small crew of young surfers paddling out twice a week.",
  ogImage: {
    path: "/media/andras-hejj.jpg",
    width: 1504,
    height: 1600,
    alt: "Andras and a young Sunset Duckie hoisting their boards overhead under a Tamarin Bay blue sky.",
  },
  membership: {
    oneChildFeeMur: 3000,
    familyFeeMur: 5000,
    feeLabel: "Rs 3,000 one kid · Rs 5,000 family",
    feeLabelLong: "Rs 3,000 for one child or Rs 5,000 for a family, per semester",
    bringYourOwn: ["surfboard", "wetsuit or rashie"],
    fundingNote:
      "Dues cover regular training — one or two sessions a week — and nothing else. Bring your own board and wetsuit; the Cup and other events are ticketed separately.",
  },
  whatsappUrl:
    "https://chat.whatsapp.com/Gmym4Kglwtw2b8mA2ETIdj?mode=gi_t",
  sponsorContactUrl:
    "https://chat.whatsapp.com/Gmym4Kglwtw2b8mA2ETIdj?mode=gi_t",
  founders: [
    {
      name: "Andras Hejj",
      role: "Founder",
      href: "https://andrashejj.com",
      image: "/media/andras-hejj.jpg",
      bio: "Runs the club on consistency, trust, and a safe path for kids to fall in love with surfing.",
    },
  ],
  sponsors: [
    { name: "Pier", href: "https://www.pierwallet.com/", logo: "/media/pier-logo.svg", wordmark: null },
    { name: "Motif", href: "https://chatwithmotif.com", logo: "/media/motif-logo.svg", wordmark: null },
    { name: "NBK Labs", href: null, logo: null, wordmark: "nbk" },
    { name: "Flipp", href: "https://www.flippapp.ai/", logo: "/media/flipp-logo.svg", wordmark: null },
    { name: "andrashejj.com", href: "https://www.andrashejj.com/", logo: null, wordmark: "andras" },
  ],
  navigation: [
    { label: "Cup", labelFull: "Sunset Duckies Cup", href: "/sunset-duckies-cup", children: [
      { label: "Vol. 01 · The first Cup", href: "/sunset-duckies-cup" },
      { label: "Vol. 02 · The next edition", href: "/sunset-duckies-cup-vol-2" },
    ] },
    { label: "Training", labelFull: "Training Materials", href: "/training-materials" },
    { label: "Blog", labelFull: "The Logbook", href: "/blog" },
    { label: "Photos", labelFull: "Gallery", href: "/gallery" },
    { label: "Branding", labelFull: "Branding", href: "/branding-plan" },
  ],
  stats: [
    { value: "100%", label: "kids in the lineup" },
    { value: "2x", label: "training sessions a week" },
    { value: "4x", label: "club comps each year" },
    { value: "Sunset", label: "every session" },
  ],
  schedule: [
    {
      day: "Monday",
      time: "4:00-6:00pm",
      focus: "Technique, confidence, whitewater reps.",
    },
    {
      day: "Friday",
      time: "4:00-6:00pm",
      focus: "Progression, free surf, longer water time.",
    },
  ],
  competition: {
    label: "Quarterly beach comp",
    title: "Four club comps a year.",
    description:
      "Kids get a milestone to train towards, families get a reason to gather on the beach.",
  },
  cup: {
    name: "Sunset Duckies Cup",
    edition: "Vol. 01 — first ever",
    dateLabel: "Sunday · 31 May 2026",
    dateISO: "2026-05-31",
    timeLabel: "13:00 – late (bonfire from 18:00)",
    location: "Tamarin Bay, Mauritius",
    entryFeeLabel: "1'000 MUR",
    registerDeadlineLabel: "Friday 15 May",
    registerCtaLabel: "Sign up via WhatsApp",
    tagline: "Heats of 4. Crowns for the kings + queens. BBQ on the sand.",
    blurb:
      "The first ever Sunset Duckies Cup, at Tamarin Bay. Two divisions, 10-minute heats, a parent heat, and a certificate for every duckling.",
    divisions: [
      {
        photo: "whitewater",
        name: "Duckling",
        description:
          "Coach pushes you in. You pop up. You ride.",
      },
      {
        photo: "beach-crew",
        name: "Duck",
        description:
          "You paddle in. You stand. You start to turn.",
      },
    ],
    runOfShow: [
      { time: "13:00", label: "Arrival + warm-up on the sand", photo: "beach-crew" },
      { time: "14:00", label: "Duckling heats", photo: "whitewater" },
      { time: "~14:45", label: "Duck heats", photo: "beach-crew" },
      { time: "15:30", label: "Break — BBQ + free surf", photo: "beach-crew" },
      { time: "16:00", label: "The Final — top ducklings + top ducks, one heat", photo: "hero-wave" },
      { time: "16:30", label: "Grey goose heat (watch the parents try)", photo: "beach-crew" },
      { time: "17:00", label: "Awards ceremony", photo: "beach-crew" },
      { time: "17:30", label: "Wind-down + teardown", photo: "beach-crew" },
      { time: "18:00", label: "Bonfire on the sand", photo: "beach-crew" },
    ],
    judgingCriteria: [
      {
        photo: "whitewater",
        title: "Paddle & commit",
        text: "Go for the wave. Don't pull back.",
      },
      {
        photo: "whitewater",
        title: "Pop-up",
        text: "Get to your feet. No knees, no cap.",
      },
      {
        photo: "whitewater",
        title: "Stance",
        text: "Knees bent, eyes forward, hands chill.",
      },
      {
        photo: "hero-wave",
        title: "Ride",
        text: "Stay standing. Ride it in.",
      },
      {
        photo: "beach-crew",
        title: "Stoke",
        text: "Finish with a smile. Claim it.",
      },
    ],
    prizes: {
      crowns: [
        { photo: "whitewater", title: "Sunset Duckling King + Queen", text: "Top duckling boy + top duckling girl in the Final." },
        { photo: "beach-crew", title: "Sunset Duckie King + Queen", text: "Top duck boy + top duck girl in the Final." },
      ],
      sideAwards: [
        { photo: "beach-crew", title: "Tried Hardest", text: "Never gave up — got back on every time." },
        { photo: "beach-crew", title: "Fell Hardest", text: "The most spectacular wipeout of the day." },
        { photo: "beach-crew", title: "Biggest Smile", text: "Lit up the whole beach, first wave to last." },
        { photo: "beach-crew", title: "Loudest Claim", text: "Celebrated that wave like a world title." },
        { photo: "beach-crew", title: "Most Improved", text: "Biggest leap from first paddle to final wave." },
        { photo: "beach-crew", title: "Best Cheer Squad", text: "Powered the loudest cheer on the sand." },
        { photo: "beach-crew", title: "Sunset Stoke", text: "The biggest claim on a knee-high wave." },
      ],
      everyone: "Every surfer gets a personalised Certificate of Stoke with their name on it.",
    },
    parentHeat: {
      title: "The Parent Heat ",
      blurb:
        "After the kids' Final, four parents are going in the water. Same rules, same scoring — but kids vote for the side awards. Loudest cheer wins.",
      awards: [
        "Best Dad Stance",
        "Best Mom Stance",
      ],
    },
    bring: [
      "Your board",
      "Rash guard or wetsuit",
      "Sunscreen, towel, warm layer for after",
    ],
    included: [
      "Entry to the comp + heat scoring",
      "BBQ for the whole fam",
      "Water for the kids at the break",
      "Prizes + personalised finisher certificate",
      "Bonfire on the sand to close the day ",
    ],
    templates: [
      {
        title: "Registration form",
        file: "/templates/registration-form.html",
        description: "Printable form for parents to fill in — surfer info, division, consents, fee receipt.",
        photo: "surf-kit",
        accent: "coral",
      },
      {
        title: "Liability waiver",
        file: "/templates/liability-waiver.html",
        description: "Signed by parent/guardian on the day. Covers the consent stuff.",
        photo: "surf-kit",
        accent: "sun",
      },
      {
        title: "Run-of-show / timetable",
        file: "/templates/run-of-show.html",
        description: "The full minute-by-minute for the day — print and pin at the registration desk.",
        photo: "surf-kit",
        accent: "teal",
      },
      {
        title: "Heat schedule & draw",
        file: "/templates/heat-schedule.html",
        description: "The running order + blank draw sheet — 2 duckling heats, 2 duck heats, one combined Final (up to 8), parent heat. Write in arm numbers on the day.",
        photo: "beach-crew",
        accent: "lilac",
      },
      {
        title: "Judge scorecard",
        file: "/templates/judge-scorecard.html",
        description: "One card per heat × judge. 4 surfers, 5 tick boxes per wave, best 2 waves count.",
        photo: "beach-crew",
        accent: "lilac",
      },
      {
        title: "MC script & cheat sheet",
        file: "/templates/mc-script.html",
        description: "Opening, heat intros, live calls, awards script — the whole MC playbook.",
        photo: "beach-crew",
        accent: "pink",
      },
      {
        title: "Welcome & announcements",
        file: "/templates/welcome-announcements.html",
        description: "Read aloud at 13:30 — welcome, food/BBQ/timetable, helpers, first aid, water-safety rules (poles, one-surfer-per-wave), heat timer flow, and the 5 judging criteria explained.",
        photo: "beach-crew",
        accent: "coral",
      },
      {
        title: "Volunteer sheet",
        file: "/templates/volunteer-roles.html",
        description: "Doing and bringing — claim a role or an item.",
        photo: "beach-crew",
        accent: "teal",
      },
      {
        title: "Payment tracker",
        file: "/templates/payment-tracker.html",
        description: "One row per kid, grouped by family — pre-filled paid/waiver status, late-add slots, totals box. Pin at the registration desk.",
        photo: "surf-kit",
        accent: "teal",
      },
      {
        title: "Pre-event checklist",
        file: "/templates/pre-event-checklist.html",
        description: "Owners + due dates from now through Saturday 30 May.",
        photo: "surf-kit",
        accent: "sun",
      },
      {
        title: "Shopping list",
        file: "/templates/shopping-list.html",
        description: "Sausages (pork + Halal), baguettes, fruit, charcoal, paper goods — quantities for ~26 plates, with the two special diets flagged.",
        photo: "surf-kit",
        accent: "pink",
      },
      {
        title: "Certificates & prizes",
        file: "/templates/certificates.html",
        description: "One printable certificate per prize — the 4 crowns (Duckling/Duckie King & Queen) plus the fun awards (Tried Hardest, Fell Hardest, Biggest Smile, and more). Type the winner's name and print.",
        photo: "beach-crew",
        accent: "sun",
      },
      {
        title: "Parent WhatsApp message",
        file: "/templates/parent-whatsapp-message.txt",
        description: "Drop straight into the parents' group — copy, paste, send.",
        photo: "beach-crew",
        accent: "lilac",
      },
    ],
    // Photos from the day. They live in a Nextcloud public share; we hotlink
    // Nextcloud's `publicpreview` endpoint (sized server-side) per image.
    // To (re)generate `files`, run `bash scripts/list-cup-photos.sh` on a
    // network that can reach owncloud.justnet.pl and paste its output below.
    photos: {
      shareUrl: "https://owncloud.justnet.pl/index.php/s/kmNsjY62yRzergT",
      base: "https://owncloud.justnet.pl",
      token: "kmNsjY62yRzergT",
      files: [
        "20260531 Sunset Duckies Cup 13.JPG",
      ],
    },
  },
  cupVol2: {
    name: "Sunset Duckies Cup",
    edition: "Vol. 02",
    dateLabel: "Friday 16 October 2026",
    timeLabel: "Earlier start · daylight finish",
    location: "Tamarin Bay, Mauritius",
    registerCtaLabel: "Get updates on WhatsApp",
    previousEdition: {
      label: "Vol. 01 · 31 May 2026",
      href: "/sunset-duckies-cup",
    },
    blurb: "Round two at Tamarin Bay — sharpened by everything Vol. 01 taught us.",
    lessons: [
      {
        photo: "surf-kit",
        tag: "Judging",
        accent: "coral",
        title: "Colour-coded rashies",
        change: "One rashie colour per surfer. Score by colour.",
      },
      {
        photo: "beach-crew",
        tag: "Format",
        accent: "sun",
        title: "Four to a heat",
        change: "Hard cap of 4. More waves each.",
      },
      {
        photo: "hero-wave",
        tag: "Scoring",
        accent: "teal",
        title: "Wave size counts",
        change: "New scoring rewards bigger, longer rides.",
      },
      {
        photo: "surf-kit",
        tag: "Scoring",
        accent: "pink",
        title: "A score per division",
        change: "Playful tick boxes for ducklings, real points for ducks.",
      },
      {
        photo: "beach-crew",
        tag: "Timing",
        accent: "lilac",
        title: "Start earlier",
        change: "Earlier start, more buffer. Crowns in daylight.",
      },
      {
        photo: "surf-kit",
        tag: "Set-up",
        accent: "sun",
        title: "Branded gazebos",
        change: "Branded gazebos for desk, judges and shade.",
      },
      {
        photo: "beach-crew",
        tag: "Food",
        accent: "coral",
        title: "More food",
        change: "More food, plus a paid stall — Shakti could help.",
      },
      {
        photo: "beach-crew",
        tag: "Judging",
        accent: "teal",
        title: "Better judges",
        change: "More experienced judges, properly briefed.",
      },
      {
        photo: "beach-crew",
        tag: "Kids",
        accent: "pink",
        title: "Stuff to do between heats",
        change: "1–2 side activities running all day.",
      },
    ],
    lockedIn: [
      "Tamarin Bay",
      "Heats of 4",
      "Colour-coded rashies",
      "Two scoring styles",
      "Earlier start",
      "Branded gazebos",
    ],
  },
  clubRules: {
    kicker: "★ Before you join — read this once",
    headline: "It's a club. Not a lesson.",
    intro:
      "Sunset Duckies is a volunteer-run club, not a surf school. Nobody is on the payroll, and the club does not provide one-on-one water supervision. Three things every family needs to be clear on before joining:",
    rules: [
      {
        title: "BYO surfboard + wetsuit",
        text: "Every kid brings their own surfboard and a wetsuit or rashie — we recommend a wetsuit. No borrowing: the club doesn't rent, lend, or store gear, and there's no club rashie.",
      },
      {
        title: "One parent gets wet",
        text: "Every family must have at least one parent or guardian in the water for the full session, including a new duckie's free first session. We had too many gnarly situations last semester to continue with parents watching only from the beach.",
      },
      {
        title: "Coach trains, doesn't babysit",
        text: "The coach is on the beach to run drills, spot, encourage, and nudge. Not a lesson. Not a lifeguard. Not a child-minder.",
      },
    ],
  },
  ageGuide: {
    kicker: "★ Is your duckie ready?",
    rangeLabel: "7 yrs +",
    headline: "Built for kids 7 and up.",
    intro:
      "We surf the shorebreak, so every duckie has to be water-confident from day one. The minimum age is 7, and the one thing that really matters:",
    requirements: [
      {
        photo: "whitewater",
        title: "Swim alone & well",
        text: "Confident swimming on their own in open water — not just the pool. This is the non-negotiable. Surf skills like paddling and popping up come later, with the crew.",
      },
    ],
    footnote: "Not quite there yet? Message on WhatsApp — we'll tell you what to work on first.",
  },
  contact: {
    coordinatorEmail: "andras@sunsetduckies.com",
    coordinatorName: "Andras",
  },
  howToJoin: {
    kicker: "★ How to join · 4 steps",
    headline: "How to join the club, in four steps.",
    intro:
      "We're volunteer-run. The path is short: meet the crew on WhatsApp, sign the waiver, take one free first session, then pay the semester fee — your private registration link follows on WhatsApp.",
    steps: [
      {
        id: "whatsapp",
        accent: "teal",
        tag: "Step 01 · meet the crew",
        title: "Join the WhatsApp group.",
        body:
          "This is where Andras posts session updates, surf calls, and answers questions. Lurk for a week, say hi when you're ready.",
        actions: [
          {
            label: "Open WhatsApp group",
            href: "https://chat.whatsapp.com/Gmym4Kglwtw2b8mA2ETIdj?mode=gi_t",
            variant: "primary",
            external: true,
          },
        ],
        footnote: "It's the club's only group — no spam.",
      },
      {
        id: "waiver",
        accent: "sun",
        tag: "Step 02 · sign the waiver",
        title: "Sign the liability waiver.",
        body:
          "Open the waiver, print or save it, fill it in, sign, then email a photo or scan back to Andras. Standard ocean-sports release — the short version below covers the gist.",
        actions: [
          {
            label: "Open the waiver",
            href: "/templates/liability-waiver.html",
            variant: "secondary",
            external: true,
          },
          {
            label: "Email signed waiver",
            href:
              "mailto:andras@sunsetduckies.com?subject=" +
              encodeURIComponent("Sunset Duckies · signed liability waiver") +
              "&body=" +
              encodeURIComponent(
                "Hi Andras,\n\nAttached is the signed liability waiver for my child to join Sunset Duckies.\n\nChild's name:\nParent / guardian name:\nPhone:\n\nThanks!\n",
              ),
            variant: "primary",
            external: false,
          },
        ],
        footnote: "Attach the photo/scan in your email client.",
      },
      {
        id: "try",
        accent: "lilac",
        tag: "Step 03 · meet us in the water",
        title: "Take your free first session.",
        body:
          "The semester kickoff on Friday 11 September from 4-6pm is open to everyone and can be a new duckie's free first session. At least one parent or guardian from every family must join in the water for the full session. After the free first session, regular Monday and Friday training is for members only.",
        actions: [
          {
            label: "See the weekly rhythm",
            href: "#schedule",
            variant: "secondary",
            external: false,
          },
        ],
        footnote: "Joining later in the semester? Message us before your free first session.",
      },
      {
        id: "register",
        accent: "coral",
        tag: "Step 04 · make it official",
        title: "Pay, then register.",
        body:
          "Once you know you're in, pay the semester fee — Rs 3,000 for one child or Rs 5,000 for a family. Andras then sends you a private registration link on WhatsApp: fill it in once, sign, done. Membership covers regular Monday and Friday training (you pick one or two sessions a week) and nothing else — gear, the Cup and other events are separate.",
        actions: [
          {
            label: "Ask Andras for payment details",
            href: "https://chat.whatsapp.com/Gmym4Kglwtw2b8mA2ETIdj?mode=gi_t",
            variant: "primary",
            external: true,
          },
        ],
        footnote: "Your registration link is private, expires in 14 days, and can be reopened to correct a detail. Cup-only? That's a separate form on the cup page.",
      },
    ],
    waiverSummary: [
      "Covers everything ducky — weekly trainings, the cup, and any other club events.",
      "Surfing carries inherent risk — waves, rocks, board contact, marine life, sun.",
      "The club is volunteer-run. Safety measures are in place, but participation is at your own risk.",
      "Your kid can swim confidently in open water — waves up to ~2 m and currents, agreed with the head coach.",
      "Every family has at least one parent or guardian in the water for the full session, including a new duckie's free first session.",
      "The crew surfs the reef at Dal from time to time — your kid may join when the coach calls it.",
      "Coaches may make reasonable medical decisions in an emergency if you can't be reached.",
      "Photo / video opt-in is your choice, ticked on the form.",
    ],
  },
  pillars: [
    {
      title: "Get good at surfing",
      text: "Two sessions a week, kids training together, real reps in the water — not a lesson.",
    },
    {
      title: "Sunset sessions",
      text: "Sessions land at golden hour in Tamarin Bay.",
    },
    {
      title: "A local crew",
      text: "Not a surf school drop-off — a club of kids, families, and coaches who keep coming back.",
    },
  ],
  materials: {
    intro:
      "A starter library for families and young surfers to use between sessions.",
    featuredRoutine: [
      "5 slow pop-ups with perfect hand placement.",
      "2 rounds of 45-second balance holds on a cushion, board, or line.",
      "10 shoulder-openers and 10 deep squats to stay mobile for paddling and take-offs.",
      "1 short ocean chat: where is the whitewater, where is the channel, and where do we safely enter?",
    ],
    categories: [
      {
        title: "Surf videos",
        status: "Coach-curated playlist coming soon",
        description:
          "We will collect the videos that best match the club's teaching style, from first-wave confidence to smoother turns.",
      },
      {
        title: "Pop-up practice",
        status: "Ready now",
        description:
          "Short, repeatable drills for getting to your feet faster while staying stable and relaxed.",
      },
      {
        title: "Balance work",
        status: "Ready now",
        description:
          "Simple exercises families can do at home with almost no equipment.",
      },
      {
        title: "Ocean knowledge",
        status: "Ready now",
        description:
          "Basic awareness around shore break, whitewater, entry points, and respect for the lineup.",
      },
      {
        title: "Competition prep",
        status: "Building now",
        description:
          "A growing set of routines to help kids feel ready before each quarterly competition day.",
      },
    ],
  },
} as const;

export const site = {
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
    annualFeeMur: 5000,
    annualFeeUsdApprox: 100,
    feeLabel: "Rs 5,000 / year",
    feeLabelLong: "Rs 5,000 / year (~$100 USD)",
    bringYourOwn: ["surfboard", "wetsuit"],
    fundingNote:
      "Dues cover comps, club lycras, and safety gear so the focus stays on surfing.",
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
    {
      name: "NBK Labs",
      href: "https://nbklabs.com",
      logo: "/media/nbk-labs-logo.svg",
      logoAlt: "NBK Labs live site wordmark",
      blurb:
        "Backs the club's operations so we stay reliable, low-overhead, and focused on the kids in the water.",
    },
    {
      name: "Motif",
      href: "https://chatwithmotif.com",
      logo: "/media/motif-logo.svg",
      logoAlt: "Motif logo",
      image: "/media/motif-og.png",
      blurb:
        "Backs the visibility and storytelling that help grow a local surf community for kids.",
    },
  ],
  navigation: [
    { label: "Cup", labelFull: "Sunset Duckies Cup", href: "/sunset-duckies-cup" },
    { label: "Vol. 02", labelFull: "Cup · Vol. 02", href: "/sunset-duckies-cup-vol-2" },
    { label: "Training", labelFull: "Training Materials", href: "/training-materials" },
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
        emoji: "🐤",
        name: "Duckling",
        description:
          "Coach pushes you in. You pop up. You ride.",
      },
      {
        emoji: "🦆",
        name: "Duck",
        description:
          "You paddle in. You stand. You start to turn.",
      },
    ],
    runOfShow: [
      { time: "13:00", label: "Arrival + warm-up on the sand", emoji: "🌅" },
      { time: "14:00", label: "Duckling heats", emoji: "🐤" },
      { time: "~14:45", label: "Duck heats", emoji: "🦆" },
      { time: "15:30", label: "Break — BBQ + free surf", emoji: "🍔" },
      { time: "16:00", label: "The Final — top ducklings + top ducks, one heat", emoji: "🌊" },
      { time: "16:30", label: "Grey goose heat (watch the parents try)", emoji: "😂" },
      { time: "17:00", label: "Awards ceremony", emoji: "🏆" },
      { time: "17:30", label: "Wind-down + teardown", emoji: "✨" },
      { time: "18:00", label: "Bonfire on the sand", emoji: "🔥" },
    ],
    judgingCriteria: [
      {
        emoji: "🏊",
        title: "Paddle & commit",
        text: "Go for the wave. Don't pull back.",
      },
      {
        emoji: "🚀",
        title: "Pop-up",
        text: "Get to your feet. No knees, no cap.",
      },
      {
        emoji: "🧘",
        title: "Stance",
        text: "Knees bent, eyes forward, hands chill.",
      },
      {
        emoji: "🌊",
        title: "Ride",
        text: "Stay standing. Ride it in.",
      },
      {
        emoji: "🎉",
        title: "Stoke",
        text: "Finish with a smile. Claim it.",
      },
    ],
    prizes: {
      crowns: [
        { emoji: "🐤", title: "Sunset Duckling King + Queen", text: "Top duckling boy + top duckling girl in the Final." },
        { emoji: "🦆", title: "Sunset Duckie King + Queen", text: "Top duck boy + top duck girl in the Final." },
      ],
      sideAwards: [
        { emoji: "💪", title: "Tried Hardest", text: "Never gave up — got back on every time." },
        { emoji: "💥", title: "Fell Hardest", text: "The most spectacular wipeout of the day." },
        { emoji: "😁", title: "Biggest Smile", text: "Lit up the whole beach, first wave to last." },
        { emoji: "📣", title: "Loudest Claim", text: "Celebrated that wave like a world title." },
        { emoji: "📈", title: "Most Improved", text: "Biggest leap from first paddle to final wave." },
        { emoji: "🎉", title: "Best Cheer Squad", text: "Powered the loudest cheer on the sand." },
        { emoji: "🌅", title: "Sunset Stoke", text: "The biggest claim on a knee-high wave." },
      ],
      everyone: "Every surfer gets a personalised Certificate of Stoke with their name on it.",
    },
    parentHeat: {
      title: "The Parent Heat 🦆",
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
      "Bonfire on the sand to close the day 🔥",
    ],
    templates: [
      {
        title: "Registration form",
        file: "/templates/registration-form.html",
        description: "Printable form for parents to fill in — surfer info, division, consents, fee receipt.",
        emoji: "📝",
        accent: "sticker-coral",
      },
      {
        title: "Liability waiver",
        file: "/templates/liability-waiver.html",
        description: "Signed by parent/guardian on the day. Covers the consent stuff.",
        emoji: "✍️",
        accent: "sticker-sun",
      },
      {
        title: "Run-of-show / timetable",
        file: "/templates/run-of-show.html",
        description: "The full minute-by-minute for the day — print and pin at the registration desk.",
        emoji: "🕒",
        accent: "sticker-teal",
      },
      {
        title: "Heat schedule & draw",
        file: "/templates/heat-schedule.html",
        description: "The running order + blank draw sheet — 2 duckling heats, 2 duck heats, one combined Final (up to 8), parent heat. Write in arm numbers on the day.",
        emoji: "🏁",
        accent: "sticker-lilac",
      },
      {
        title: "Judge scorecard",
        file: "/templates/judge-scorecard.html",
        description: "One card per heat × judge. 4 surfers, 5 tick boxes per wave, best 2 waves count.",
        emoji: "🏁",
        accent: "sticker-lilac",
      },
      {
        title: "MC script & cheat sheet",
        file: "/templates/mc-script.html",
        description: "Opening, heat intros, live calls, awards script — the whole MC playbook.",
        emoji: "🎤",
        accent: "sticker-pink",
      },
      {
        title: "Welcome & announcements",
        file: "/templates/welcome-announcements.html",
        description: "Read aloud at 13:30 — welcome, food/BBQ/timetable, helpers, first aid, water-safety rules (poles, one-surfer-per-wave), heat timer flow, and the 5 judging criteria explained.",
        emoji: "📣",
        accent: "sticker-coral",
      },
      {
        title: "Volunteer sheet",
        file: "/templates/volunteer-roles.html",
        description: "Doing and bringing — claim a role or an item.",
        emoji: "🙌",
        accent: "sticker-teal",
      },
      {
        title: "Payment tracker",
        file: "/templates/payment-tracker.html",
        description: "One row per kid, grouped by family — pre-filled paid/waiver status, late-add slots, totals box. Pin at the registration desk.",
        emoji: "💰",
        accent: "sticker-teal",
      },
      {
        title: "Pre-event checklist",
        file: "/templates/pre-event-checklist.html",
        description: "Owners + due dates from now through Saturday 30 May.",
        emoji: "✅",
        accent: "sticker-sun",
      },
      {
        title: "Shopping list",
        file: "/templates/shopping-list.html",
        description: "Sausages (pork + Halal), baguettes, fruit, charcoal, paper goods — quantities for ~26 plates, with the two special diets flagged.",
        emoji: "🛒",
        accent: "sticker-pink",
      },
      {
        title: "Certificates & prizes",
        file: "/templates/certificates.html",
        description: "One printable certificate per prize — the 4 crowns (Duckling/Duckie King & Queen) plus the fun awards (Tried Hardest, Fell Hardest, Biggest Smile, and more). Type the winner's name and print.",
        emoji: "👑",
        accent: "sticker-sun",
      },
      {
        title: "Parent WhatsApp message",
        file: "/templates/parent-whatsapp-message.txt",
        description: "Drop straight into the parents' group — copy, paste, send.",
        emoji: "💬",
        accent: "sticker-lilac",
      },
    ],
  },
  cupVol2: {
    name: "Sunset Duckies Cup",
    edition: "Vol. 02",
    dateLabel: "Saturday · 27 June 2026",
    dateISO: "2026-06-27",
    timeLabel: "Earlier start · daylight finish",
    location: "Tamarin Bay, Mauritius",
    registerCtaLabel: "Save the date on WhatsApp",
    previousEdition: {
      label: "Vol. 01 · 31 May 2026",
      href: "/sunset-duckies-cup",
    },
    blurb: "Round two at Tamarin Bay — sharpened by everything Vol. 01 taught us.",
    lessons: [
      {
        emoji: "🎽",
        tag: "Judging",
        accent: "sticker-coral",
        title: "Colour-coded rashies",
        learned: "Same kit on everyone — judges lost track.",
        change: "One rashie colour per surfer. Score by colour.",
      },
      {
        emoji: "🦆",
        tag: "Format",
        accent: "sticker-sun",
        title: "Four to a heat",
        learned: "Heats of six got crowded and messy to score.",
        change: "Hard cap of 4. More waves each.",
      },
      {
        emoji: "🌊",
        tag: "Scoring",
        accent: "sticker-teal",
        title: "Wave size counts",
        learned: "Tick boxes scored an ankle-slapper like a real wall.",
        change: "New scoring rewards bigger, longer rides.",
      },
      {
        emoji: "⚖️",
        tag: "Scoring",
        accent: "sticker-pink",
        title: "A score per division",
        learned: "One card couldn't fit both divisions.",
        change: "Playful tick boxes for ducklings, real points for ducks.",
      },
      {
        emoji: "🌅",
        tag: "Timing",
        accent: "sticker-lilac",
        title: "Start earlier",
        learned: "13:00–18:00 ran into the dark.",
        change: "Earlier start, more buffer. Crowns in daylight.",
      },
      {
        emoji: "⛺",
        tag: "Set-up",
        accent: "sticker-sun",
        title: "Branded gazebos",
        learned: "No shade to register or judge from.",
        change: "Branded gazebos for desk, judges and shade.",
      },
      {
        emoji: "🍔",
        tag: "Food",
        accent: "sticker-coral",
        title: "More food",
        learned: "The BBQ ran thin.",
        change: "More food, plus a paid stall — Shakti could help.",
      },
      {
        emoji: "👀",
        tag: "Judging",
        accent: "sticker-teal",
        title: "Better judges",
        learned: "Judging was the wobbliest part of the day.",
        change: "More experienced judges, properly briefed.",
      },
      {
        emoji: "🏖️",
        tag: "Kids",
        accent: "sticker-pink",
        title: "Stuff to do between heats",
        learned: "Waiting kids got restless.",
        change: "1–2 side activities running all day.",
      },
    ],
    lockedIn: [
      "Saturday 27 June",
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
      "Sunset Duckies is a volunteer-run club, not a surf school. Nobody is on the payroll, nobody is in the water with your kid. Three things every family needs to be clear on before joining:",
    rules: [
      {
        title: "BYO surfboard + wetsuit",
        text: "Every kid brings their own board and wetsuit, every session. We don't rent, lend, or store gear. No board, no surf.",
      },
      {
        title: "Parents stay responsible",
        text: "Your child, your call. A parent or guardian stays on the beach or in the water with their kid for the whole session. The club does not take legal responsibility for what happens in the ocean.",
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
      "We surf the shorebreak, so every duckie has to be water-confident from day one. Kids are usually ready from around 7 — but age is a guide, not a gate. The one thing that really matters:",
    requirements: [
      {
        emoji: "🏊",
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
      "We're volunteer-run, no online portal. The path is short: meet the crew on WhatsApp, sign the waiver, try a couple of sessions, then make it official. Email anything signed straight to Andras.",
    steps: [
      {
        id: "whatsapp",
        accent: "sticker-teal",
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
        accent: "sticker-sun",
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
        accent: "sticker-lilac",
        tag: "Step 03 · come paddle",
        title: "Try a few training sessions.",
        body:
          "Monday and Friday, 4–6pm in Tamarin Bay. A parent stays on-site (beach or water). One or two trial sessions without a board are fine — after that we want kids on their own surfboard (rentable across the road) and in a wetsuit for the winter months.",
        actions: [
          {
            label: "See the weekly rhythm",
            href: "#schedule",
            variant: "secondary",
            external: false,
          },
        ],
        footnote: "First time? Message on WhatsApp before you come so we can spot you.",
      },
      {
        id: "register",
        accent: "sticker-coral",
        tag: "Step 04 · make it official",
        title: "Join the club.",
        body:
          "Once you know you're in, fill the club registration form and email it to Andras. Annual dues are Rs 5,000 — covers a custom club rashie with your kid's name, two coached sessions a week, safety cover at trainings, the club WhatsApp, and end-of-season certificates. Competitions like the Cup are ticketed separately.",
        actions: [
          {
            label: "Open club registration form",
            href: "/templates/club-registration-form.html",
            variant: "secondary",
            external: true,
          },
          {
            label: "Email registration",
            href:
              "mailto:andras@sunsetduckies.com?subject=" +
              encodeURIComponent("Sunset Duckies · club membership registration") +
              "&body=" +
              encodeURIComponent(
                "Hi Andras,\n\nAttached is our completed Sunset Duckies club membership registration form.\n\nChild's name:\nAge:\nRashie size + name to print:\nParent / guardian name:\nPhone:\n\nWe've also signed the liability waiver (sent separately / attached).\n\nThanks!\n",
              ),
            variant: "primary",
            external: false,
          },
        ],
        footnote: "We'll confirm by WhatsApp once you're in. Cup-only? That's a separate form on the cup page.",
      },
    ],
    waiverSummary: [
      "Covers everything ducky — weekly trainings, the cup, and any other club events.",
      "Surfing carries inherent risk — waves, rocks, board contact, marine life, sun.",
      "The club is volunteer-run. Safety measures are in place, but participation is at your own risk.",
      "Your kid can swim confidently in open water — waves up to ~2 m and currents, agreed with the head coach.",
      "A parent or guardian stays on-site every session, watching from the beach or joining in the water — never a drop-off.",
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

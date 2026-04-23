export const site = {
  name: "Sunset Duckies",
  shortName: "Sunset Duckies",
  url: "https://sunsetduckies.com",
  location: "Tamarin Bay, Mauritius",
  locale: "en_MU",
  description:
    "A kids' surf club in Tamarin Bay. Young duckies paddling out, getting amazing at surfing, and riding into the sunset week after week.",
  ogImage: {
    path: "/media/sunset-training.jpg",
    width: 1600,
    height: 1200,
    alt: "Young Sunset Duckies training on the beach as the sun drops over Tamarin Bay.",
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
      image: "/media/andras-hejj.png",
      bio: "Runs the club on consistency, trust, and a safe path for kids to lowkey fall in love with surfing.",
    },
  ],
  sponsors: [
    {
      name: "NBK Labs",
      href: "https://nbklabs.com",
      logo: "/media/nbk-labs-logo.svg",
      logoAlt: "NBK Labs live site wordmark",
      blurb:
        "Backing practical systems and community infrastructure that help the club stay reliable, low-overhead, and focused on the kids in the water.",
    },
    {
      name: "Motif",
      href: "https://chatwithmotif.com",
      logo: "/media/motif-logo.svg",
      logoAlt: "Motif logo",
      image: "/media/motif-og.png",
      blurb:
        "Backing the story, visibility, and momentum needed to grow a strong local surf community for kids — no gatekeeping.",
    },
  ],
  navigation: [
    { label: "Why Sunset Duckies", href: "/#why-sunset-duckies" },
    { label: "Schedule", href: "/#schedule" },
    { label: "Sponsors", href: "/#sponsors" },
    { label: "Training Materials", href: "/training-materials" },
  ],
  stats: [
    { value: "100%", label: "kids in the lineup" },
    { value: "2x", label: "training sessions a week" },
    { value: "4x", label: "club comps each year" },
    { value: "Sunset", label: "every session, every time" },
  ],
  schedule: [
    {
      day: "Wednesday",
      time: "4:00-6:00pm",
      focus: "Technique, confidence, and whitewater reps that actually hit.",
    },
    {
      day: "Friday",
      time: "4:00-6:00pm",
      focus: "Playful progression, real community, big wave time.",
    },
  ],
  competition: {
    label: "Quarterly beach comp",
    title: "Four moments a year the whole club trains toward.",
    description:
      "Each comp is built to feel hype, supportive, and unforgettable. Kids get a real milestone to lock in for, families get a reason to gather, and sponsors get visibility in the only setting that matters — a thriving local crew.",
  },
  pillars: [
    {
      title: "Actually get amazing at surfing",
      text: "Two sessions a week, proper coaching, and the reps that turn first-wave wobbles into paddle-outs the kids chase on their own.",
    },
    {
      title: "Sunset hour, every time",
      text: "Sessions land at golden hour in Tamarin Bay. Warm light, clean lineups, and that last wave home as the sky goes pink.",
    },
    {
      title: "A lineup that shows up",
      text: "Sunset Duckies isn't a surf school drop-off. It's a consistent local crew of kids, families, and coaches who keep coming back.",
    },
  ],
  materials: {
    intro:
      "A public starter library so families and young surfers can keep the streak alive between sessions.",
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

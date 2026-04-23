export const site = {
  name: "Sunset Surfers",
  shortName: "Sunset Surfers",
  location: "Tamarin Bay, Mauritius",
  description:
    "A member-funded surf club helping kids in Tamarin build real confidence in the water, on the beach, and with each other.",
  membership: {
    annualFeeMur: 5000,
    annualFeeUsdApprox: 100,
    feeLabel: "Rs 5,000 / year",
    feeLabelLong: "Rs 5,000 / year (~$100 USD)",
    bringYourOwn: ["surfboard", "wetsuit"],
    fundingNote:
      "Dues fund comps, club lycras, safety gear, and the moments that make the club hit different.",
  },
  whatsappUrl:
    "https://chat.whatsapp.com/Gmym4Kglwtw2b8mA2ETIdj?mode=gi_t",
  sponsorContactUrl:
    "https://chat.whatsapp.com/Gmym4Kglwtw2b8mA2ETIdj?mode=gi_t",
  founders: [
    {
      name: "Andras Hejj",
      role: "Co-founder",
      href: "https://andrashejj.com",
      image: "/media/andras-hejj.png",
      bio: "Runs the club on consistency, trust, and a safe path for kids to lowkey fall in love with surfing.",
    },
    {
      name: "Theola Vlok",
      role: "Co-founder",
      bio: "Shapes the club culture so every session feels welcoming, calm, and quietly confidence-building.",
    },
  ],
  sponsors: [
    {
      name: "NBK Labs",
      href: "https://nbklabs.com",
      logo: "/media/nbk-labs-logo.svg",
      logoAlt: "NBK Labs live site wordmark",
      blurb:
        "Backing practical systems and community infrastructure that help the club stay reliable, member-funded, and zero-overhead.",
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
    { label: "Why Sunset Surfers", href: "/#why-sunset-surfers" },
    { label: "Schedule", href: "/#schedule" },
    { label: "Sponsors", href: "/#sponsors" },
    { label: "Training Materials", href: "/training-materials" },
  ],
  stats: [
    { value: "100%", label: "reinvested in the kids" },
    { value: "2x", label: "sessions each week" },
    { value: "4x", label: "club comps each year" },
    { value: "Rs 5K", label: "annual dues — every cent reinvested" },
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
      title: "Real water confidence",
      text: "Sessions are built so the ocean stops feeling scary and starts feeling like home — for first-timers and groms alike.",
    },
    {
      title: "Community first, fr",
      text: "Sunset Surfers isn't a transactional surf school. It's a consistent local club where kids, families, and supporters keep showing up.",
    },
    {
      title: "Progress with joy",
      text: "Dead serious about safety and growth, but the vibe stays light, inviting, and full of momentum.",
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

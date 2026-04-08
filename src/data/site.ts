export const site = {
  name: "Duckies Surf Club",
  shortName: "Duckies",
  location: "Tamarin Bay, Mauritius",
  description:
    "A free, community-led surf club helping kids in Tamarin build confidence in the water, on the beach, and with each other.",
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
      bio: "Builds the club around consistency, trust, and a safe path for kids to fall in love with surfing.",
    },
    {
      name: "Theola Vlok",
      role: "Founder",
      bio: "Helps shape the club culture so every session feels welcoming, calm, and confidence-building.",
    },
  ],
  sponsors: [
    {
      name: "NBK Labs",
      href: "https://nbklabs.com",
      logo: "/media/nbk-labs-logo.svg",
      logoAlt: "NBK Labs live site wordmark",
      blurb:
        "Backing practical systems and community infrastructure that help the club stay reliable and free of charge.",
    },
    {
      name: "Motif",
      href: "https://chatwithmotif.com",
      logo: "/media/motif-logo.svg",
      logoAlt: "Motif logo",
      image: "/media/motif-og.png",
      blurb:
        "Supporting the story, visibility, and momentum needed to grow a strong local surf community for kids.",
    },
  ],
  navigation: [
    { label: "Why Duckies", href: "/#why-duckies" },
    { label: "Schedule", href: "/#schedule" },
    { label: "Sponsors", href: "/#sponsors" },
    { label: "Training Materials", href: "/training-materials" },
  ],
  stats: [
    { value: "100%", label: "free of charge" },
    { value: "2x", label: "sessions each week" },
    { value: "4x", label: "club competitions each year" },
    { value: "Local", label: "founder-led in Tamarin" },
  ],
  schedule: [
    {
      day: "Wednesday",
      time: "4:00-6:00pm",
      focus: "Technique, confidence, and whitewater repetition.",
    },
    {
      day: "Friday",
      time: "4:00-6:00pm",
      focus: "Playful progression, community, and wave time.",
    },
  ],
  competition: {
    label: "Quarterly beach comp",
    title: "Four moments a year that the whole club trains toward.",
    description:
      "Each competition is designed to feel exciting, supportive, and memorable. Kids get a real milestone to prepare for, families get a reason to gather, and sponsors get to be visible in the best possible setting: a thriving local community.",
  },
  pillars: [
    {
      title: "Real water confidence",
      text: "Sessions are built to make the ocean feel familiar, exciting, and manageable for young surfers.",
    },
    {
      title: "Community first",
      text: "Duckies is not a transactional surf school. It is a consistent local club where kids, families, and supporters keep showing up.",
    },
    {
      title: "Progress with joy",
      text: "The tone is serious about safety and growth, but the feeling is light, inviting, and full of momentum.",
    },
  ],
  materials: {
    intro:
      "A public starter library for families and young surfers to keep momentum between sessions.",
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

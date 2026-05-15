type Sponsor = {
  readonly name: string;
  readonly href: string;
  readonly logo?: string;
  readonly logoAlt?: string;
  readonly image?: string;
  readonly blurb: string;
};

type NavItem = {
  readonly label: string;
  readonly labelFull?: string;
  readonly href: string;
};

type ProductColor = "cream" | "teal" | "sun" | "coral" | "lilac" | "ink";

type Product = {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly price: number;
  readonly priceLabel: string;
  readonly color: ProductColor;
  readonly kind: string;
  readonly sizes: string;
  readonly description: string;
  readonly image: string;
  readonly imageAlt?: string;
  readonly featured?: boolean;
};

const sponsors: readonly Sponsor[] = [
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
];

const navigation: readonly NavItem[] = [
  { label: "Cup", labelFull: "Sunset Duckies Cup", href: "/sunset-duckies-cup" },
  { label: "Training", labelFull: "Training Materials", href: "/training-materials" },
  { label: "Shop", labelFull: "Shop", href: "/shop" },
];

const products: readonly Product[] = [
  {
    id: "tee-cream",
    name: "Real Grit Tee",
    tagline: "Cream · front print",
    price: 850,
    priceLabel: "Rs 850",
    color: "ink",
    kind: "Tee",
    sizes: "Kids 4-14 · Adult XS-XXL",
    description:
      "Heavyweight cream cotton, front 'Real Grit. No Cap.' block print with wave squiggle.",
    image: "/media/shop/tee-cream.png",
    imageAlt:
      "Heavyweight cream cotton Real Grit tee with the Sunset Duckies duck-in-cap logo on the chest.",
  },
  {
    id: "tee-black",
    name: "Duckies Circle Tee",
    tagline: "Black · chest badge",
    price: 850,
    priceLabel: "Rs 850",
    color: "cream",
    kind: "Tee",
    sizes: "Kids 4-14 · Adult XS-XXL",
    description:
      "Soft-wash black tee with the sunset circle badge on the chest. Goes with everything.",
    image: "/media/shop/tee-black.png",
    imageAlt:
      "Soft-wash black tee with the sunset duck-in-cap badge printed on the chest.",
  },
  {
    id: "tee-surf-club",
    name: "Surf Club Tee",
    tagline: "White · circle back print",
    price: 850,
    priceLabel: "Rs 850",
    color: "teal",
    kind: "Tee",
    sizes: "Kids 4-14 · Adult XS-XXL",
    description:
      "Bright white cotton tee with the full Sunset Duckies 'Surf Club for Kids' lockup on the back.",
    image: "/media/shop/tee-surf-club.png",
    imageAlt:
      "Back of a white Sunset Duckies tee with the 'Surf Club For Kids' sunset circle lockup on an ocean-teal background.",
  },
  {
    id: "longsleeve-teal",
    name: "Salty Hair Longsleeve",
    tagline: "Ocean teal · sleeve print",
    price: 950,
    priceLabel: "Rs 950",
    color: "lilac",
    kind: "Long sleeve",
    sizes: "Adult XS-XXL",
    description:
      "Sunset circle back, 'SALTY HAIR' running down both sleeves. For post-sesh bonfire chill.",
    image: "/media/shop/longsleeve-teal.png",
    imageAlt:
      "Ocean-teal long sleeve with sunset circle back print and 'BUILT 4 BABES' / 'SURF TIME' down the sleeves, on a cool lilac background.",
  },
  {
    id: "hoodie-black",
    name: "No Cap Hoodie",
    tagline: "Heavyweight · back print",
    price: 2500,
    priceLabel: "Rs 2,500",
    color: "ink",
    kind: "Hoodie",
    sizes: "Kids 4-14 · Adult XS-XXL",
    description:
      "Brushed-fleece black hoodie. 'Salty Hair. Real Grit. No Cap.' back print with duck + waves.",
    image: "/media/shop/hoodie-black.png",
    imageAlt:
      "Heavyweight black hoodie, back view, with the 'SALTY HAIR · REAL GRIT · NO CAP.' back print and duck + wave mark.",
  },
  {
    id: "bucket-hat",
    name: "Sunset Bucket",
    tagline: "Cream canvas · embroidered",
    price: 750,
    priceLabel: "Rs 750",
    color: "sun",
    kind: "Headwear",
    sizes: "Kids + adult",
    description:
      "Soft cotton bucket with embroidered Sunset Duckies logo. Classic fit for every adventure.",
    image: "/media/shop/bucket-hat.png",
    imageAlt:
      "Cream canvas bucket hat with the embroidered Sunset Duckies sunset circle logo, on a duck-yellow background.",
  },
  {
    id: "cap",
    name: "Duckies Cap",
    tagline: "Black · 6-panel",
    price: 650,
    priceLabel: "Rs 650",
    color: "lilac",
    kind: "Headwear",
    sizes: "Kids + adult",
    description:
      "Classic 6-panel with white 'DUCKIES' script on the front. Adjustable strap for the perfect fit.",
    image: "/media/shop/cap.png",
    imageAlt:
      "Black 6-panel cap with white 'DUCKIES' script on the front, on a cool lilac background.",
  },
  {
    id: "duckies-kit",
    name: "The Duckies Kit",
    tagline: "Box drop · one-and-done",
    price: 3500,
    priceLabel: "Rs 3,500",
    color: "ink",
    kind: "Founding bundle",
    sizes: "Kid + adult",
    description:
      "Tee, sticker sheet, lanyard, and notebook in a matte black drop-box. The way you join the lineup.",
    featured: true,
    image: "/media/shop/duckies-kit.png",
    imageAlt:
      "Matte black 'The Duckies Kit' drop-box with a folded cream tee, sticker sheet, lanyard, and notebook laid out beside it on a deep-navy background.",
  },
];

export type { Sponsor, Product, ProductColor };

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
      bio: "Runs the club on consistency and trust, giving kids a safe way into surfing.",
    },
  ],
  sponsors,
  navigation,
  stats: [
    { value: "100%", label: "kids in the lineup" },
    { value: "2x", label: "training sessions a week" },
    { value: "4x", label: "club comps each year" },
    { value: "Sunset", label: "every session" },
  ],
  schedule: [
    {
      day: "Wednesday",
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
    edition: "Vol. 01 · first ever",
    dateLabel: "Saturday · 30 May 2026",
    dateISO: "2026-05-30",
    timeLabel: "13:00 – 17:30",
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
      { time: "15:30", label: "Break, BBQ, free surf", emoji: "🍔" },
      { time: "16:00", label: "Final heats (best of duckling & duck)", emoji: "🌊" },
      { time: "16:30", label: "Grey goose heat (watch the parents try)", emoji: "😂" },
      { time: "17:00", label: "Awards ceremony", emoji: "🏆" },
      { time: "17:30", label: "Wrap", emoji: "✨" },
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
        { emoji: "🐤", title: "Duckling King + Queen", text: "Top boy + top girl, Duckling division." },
        { emoji: "🦆", title: "Duck King + Queen", text: "Top boy + top girl, Duck division." },
        { emoji: "🏄‍♀️", title: "Sunset Duckies King + Queen", text: "Top boy + top girl, overall." },
      ],
      sideAwards: [
        { emoji: "🌅", title: "Sunset Stoke", text: "Biggest celebration of the day." },
        { emoji: "💪", title: "Paddle Power", text: "Never stopped going for waves." },
        { emoji: "💦", title: "Best Wipeout", text: "Fell hardest, smiled hardest." },
        { emoji: "✨", title: "Style Duckling", text: "That one moment of perfect balance." },
        { emoji: "🔄", title: "Best Comeback", text: "Fell off, jumped right back on." },
        { emoji: "📣", title: "Best Cheer Squad", text: "Cheered loudest for everyone else." },
      ],
      everyone: "Every duckling gets a personalised finisher certificate with their name on it.",
    },
    parentHeat: {
      title: "The Parent Heat 🦆",
      blurb:
        "After the kids' finals, four parents are going in the water. Same rules, same scoring. Kids vote for the side awards, loudest cheer wins.",
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
    ],
    templates: [
      {
        title: "Registration form",
        file: "/templates/registration-form.html",
        description: "Printable form for parents to fill in. Surfer info, division, consents, fee receipt.",
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
        description: "The full minute-by-minute for the day. Print and pin at the registration desk.",
        emoji: "🕒",
        accent: "sticker-teal",
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
        description: "Opening, heat intros, live calls, awards script. The whole MC playbook.",
        emoji: "🎤",
        accent: "sticker-pink",
      },
      {
        title: "Volunteer sheet",
        file: "/templates/volunteer-roles.html",
        description: "Doing and bringing. Claim a role or an item.",
        emoji: "🙌",
        accent: "sticker-teal",
      },
      {
        title: "Pre-event checklist",
        file: "/templates/pre-event-checklist.html",
        description: "Owners + due dates from now through Friday 29 May.",
        emoji: "✅",
        accent: "sticker-sun",
      },
      {
        title: "Shopping list",
        file: "/templates/shopping-list.html",
        description: "Sausages, buns, sides, drinks, charcoal. Quantities for ~25 mouths with rough MUR costs.",
        emoji: "🛒",
        accent: "sticker-pink",
      },
      {
        title: "Finisher certificate",
        file: "/templates/finisher-certificate.html",
        description: "Personalised certificate template. Print one per duckling.",
        emoji: "🏆",
        accent: "sticker-coral",
      },
      {
        title: "Parent WhatsApp message",
        file: "/templates/parent-whatsapp-message.txt",
        description: "Drop straight into the parents' group. Copy, paste, send.",
        emoji: "💬",
        accent: "sticker-lilac",
      },
    ],
  },
  pillars: [
    {
      title: "Get good at surfing",
      text: "Two sessions a week, proper coaching, real reps in the water.",
    },
    {
      title: "Sunset sessions",
      text: "Sessions land at golden hour in Tamarin Bay.",
    },
    {
      title: "A local crew",
      text: "A club of kids, families, and coaches who keep coming back to the same lineup.",
    },
  ],
  shop: {
    dropLabel: "Drop 001 · Founding kit",
    tagline: "Reserve at sesh. Pickup at sesh.",
    intro:
      "The first wave of Sunset Duckies kit. Tested on salty kids, printed in small runs in Tamarin. Reserve a piece for your duckie and grab it at the next Wed or Fri sesh.",
    steps: [
      {
        title: "Pick a piece",
        text: "Every card opens a quick reservation form: name, kid's name, size, qty. No checkout, no card.",
      },
      {
        title: "Lock it in",
        text: "We confirm on WhatsApp and add it to the next print batch with Gorgeia, our local printer.",
      },
      {
        title: "Grab at sesh",
        text: "Pickup at Wed or Fri sesh, 4-6pm, Tamarin Bay. Andras hands it over on the beach.",
      },
    ],
    notes: [
      "Small-run printing · expect 1-2 weeks from reservation to hand-over.",
      "Kids sizes 4-14 · adult sizes XS-XXL on most apparel.",
      "All proceeds circle back into comps, lycras, and scholarships.",
    ],
    teaserProductIds: [
      "tee-cream",
      "tee-black",
      "tee-surf-club",
      "longsleeve-teal",
      "hoodie-black",
      "bucket-hat",
      "cap",
      "duckies-kit",
    ],
    products,
  },
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

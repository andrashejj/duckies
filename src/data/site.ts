type Sponsor = {
  readonly name: string;
  readonly href: string;
  readonly logo?: string;
  readonly logoAlt?: string;
  readonly image?: string;
  readonly blurb: string;
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
    "Kids' surf club in Tamarin Bay, fr. Young duckies paddling out, locking in on surfing, and chasing the sunset every sesh — lowkey the best crew on the island.",
  ogImage: {
    path: "/media/andras-hejj.jpg",
    width: 1504,
    height: 1600,
    alt: "Andras and a young Sunset Duckie hoisting their boards overhead under a Tamarin Bay blue sky — big sesh energy.",
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
      bio: "Runs the club on consistency, trust, and a safe path for kids to lowkey fall in love with surfing.",
    },
  ],
  sponsors,
  navigation: [
    { label: "Why Sunset Duckies", href: "/#why-sunset-duckies" },
    { label: "Schedule", href: "/#schedule" },
    { label: "Shop", href: "/shop" },
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
  shop: {
    dropLabel: "Drop 001 · Founding kit",
    tagline: "Reserve at sesh. Pickup at sesh.",
    intro:
      "The first wave of Sunset Duckies kit — tested on salty kids, printed in small runs in Tamarin. Reserve a piece for your duckie, pick it up at the next Wed/Fri sesh.",
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

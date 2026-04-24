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
    tagline: "Pre-order via WhatsApp. Pick up at sesh.",
    intro:
      "The first wave of Sunset Duckies swag — tested on salty kids, printed in small runs. This is a teaser drop: pick a piece, DM us, pay in Rs via Juice or cash at Wednesday/Friday sesh. No carts, no checkout, no shipping stress.",
    orderPreamble:
      "Yo Duckies — I'd like to lock in the drop:",
    orderOutro:
      "Can you confirm size / pickup? I'll pay on confirm. ✦",
    payment: [
      {
        label: "JUICE by MCB",
        detail:
          "Mauritius mobile payment. Send Rs, screenshot the receipt, drop it in chat. We'll share the Juice number when the order's locked.",
        tag: "Mobile · MUR",
      },
      {
        label: "Cash at sesh",
        detail:
          "Rock up Wednesday or Friday 4-6pm at Tamarin Bay. Pay the coach, walk away with the kit.",
        tag: "In person",
      },
      {
        label: "Bank transfer",
        detail:
          "For orders over Rs 2,000 or if you're off-island. We'll send account details in the WhatsApp thread.",
        tag: "On request",
      },
    ],
    steps: [
      {
        title: "Tap a piece",
        text: "Every card has an 'Order via WhatsApp' button. It opens WhatsApp with your order pre-written.",
      },
      {
        title: "Confirm in chat",
        text: "Tell us size, qty, and whether it's pickup at sesh or delivery in Tamarin. We reply same-day.",
      },
      {
        title: "Pay your way",
        text: "Juice, cash at sesh, or bank transfer. Once it's paid, the kit is yours.",
      },
    ],
    notes: [
      "Small-run printing · expect 1-2 weeks from order to hand-over.",
      "Kids sizes 4-14 · adult sizes XS-XXL on most apparel.",
      "All proceeds circle back into comps, lycras, and scholarships.",
    ],
    products: [
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
      },
      {
        id: "tee-cream",
        name: "Real Grit Tee",
        tagline: "Cream · front print",
        price: 850,
        priceLabel: "Rs 850",
        color: "cream",
        kind: "Tee",
        sizes: "Kids 4-14 · Adult XS-XXL",
        description: "Heavyweight cream cotton, front 'Real Grit. No Cap.' block print with wave squiggle.",
      },
      {
        id: "tee-black",
        name: "Duckies Circle Tee",
        tagline: "Black · chest badge",
        price: 850,
        priceLabel: "Rs 850",
        color: "ink",
        kind: "Tee",
        sizes: "Kids 4-14 · Adult XS-XXL",
        description: "Soft-wash black tee with the sunset circle badge on the chest. Goes with everything.",
      },
      {
        id: "longsleeve-teal",
        name: "Salty Hair Longsleeve",
        tagline: "Ocean teal · sleeve print",
        price: 1200,
        priceLabel: "Rs 1,200",
        color: "teal",
        kind: "Long sleeve",
        sizes: "Adult XS-XXL",
        description: "Sunset circle front, 'SALTY HAIR' running down both sleeves. For post-sesh bonfire chill.",
      },
      {
        id: "hoodie-black",
        name: "No Cap Hoodie",
        tagline: "Heavyweight · back print",
        price: 2500,
        priceLabel: "Rs 2,500",
        color: "ink",
        kind: "Hoodie",
        sizes: "Kids 8-14 · Adult XS-XXL",
        description: "Brushed-fleece black hoodie. 'Salty Hair. Real Grit. No Cap.' block on the back.",
      },
      {
        id: "bucket-hat",
        name: "Sunset Bucket",
        tagline: "Cream canvas",
        price: 750,
        priceLabel: "Rs 750",
        color: "cream",
        kind: "Headwear",
        sizes: "Kids + adult",
        description: "Soft cotton bucket with embroidered sunset badge. Shades the eyes, keeps it breezy.",
      },
      {
        id: "cap",
        name: "Duckies Cap",
        tagline: "Black · 6-panel",
        price: 650,
        priceLabel: "Rs 650",
        color: "ink",
        kind: "Headwear",
        sizes: "One size, adjustable",
        description: "Classic 6-panel with white 'DUCKIES' script on the front. Curved brim, low profile.",
      },
      {
        id: "sunnies",
        name: "Duckies Shades",
        tagline: "UV400 · polycarb",
        price: 650,
        priceLabel: "Rs 650",
        color: "ink",
        kind: "Accessories",
        sizes: "Kids + adult",
        description: "Matte black frames with 'DUCKIES' side print. UV400 lenses for actual beach use.",
      },
      {
        id: "sticker-pack",
        name: "Sticker Sheet",
        tagline: "9 die-cuts",
        price: 250,
        priceLabel: "Rs 250",
        color: "sun",
        kind: "Stickers",
        sizes: "A5 sheet",
        description: "Sunset circle, wave, bolt, checker, duckie, shades, 'NO CAP'. Waterproof vinyl.",
      },
      {
        id: "tote",
        name: "Sunset Tote",
        tagline: "Natural canvas",
        price: 550,
        priceLabel: "Rs 550",
        color: "cream",
        kind: "Bag",
        sizes: "38 × 42cm",
        description: "Thick canvas shopper with the Sunset Duckies circle. Fits towels, wax, and snacks.",
      },
      {
        id: "bottle",
        name: "Steel Bottle",
        tagline: "500ml insulated",
        price: 850,
        priceLabel: "Rs 850",
        color: "ink",
        kind: "Hydration",
        sizes: "500ml",
        description: "Double-wall stainless, matte black, laser-etched wordmark. Cold for 12h, hot for 6h.",
      },
      {
        id: "tailpad",
        name: "Duckie Tailpad",
        tagline: "Arch + kick",
        price: 1800,
        priceLabel: "Rs 1,800",
        color: "ink",
        kind: "Board",
        sizes: "3-piece",
        description: "Grippy EVA pad with duckie motif, wave squiggle, and mid arch. For when you're ready to commit.",
      },
      {
        id: "wax",
        name: "Duckies Wax",
        tagline: "Tropical · coconut scent",
        price: 300,
        priceLabel: "Rs 300",
        color: "teal",
        kind: "Board",
        sizes: "Bar, ~80g",
        description: "Hand-poured tropical wax in the club's teal puck. Smells like coconut and salt water.",
      },
      {
        id: "keychain",
        name: "Duckies Keychain",
        tagline: "Acrylic tag",
        price: 150,
        priceLabel: "Rs 150",
        color: "sun",
        kind: "Accessories",
        sizes: "One size",
        description: "Yellow acrylic tag with 'DUCKIES' block print. Loud, tiny, real.",
      },
      {
        id: "notebook",
        name: "Notes from the Ocean",
        tagline: "Spiral · A5",
        price: 450,
        priceLabel: "Rs 450",
        color: "ink",
        kind: "Paper",
        sizes: "A5 · 80 pages",
        description: "Matte black spiral notebook. Lined pages for sesh notes, tide logs, and wave counts.",
      },
      {
        id: "lanyard",
        name: "Duckies Lanyard",
        tagline: "Woven · card holder",
        price: 350,
        priceLabel: "Rs 350",
        color: "ink",
        kind: "Accessories",
        sizes: "One size",
        description: "Woven 'SUNSET DUCKIES SURF CLUB' lanyard with a card-pocket badge. Comp-day energy.",
      },
    ],
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

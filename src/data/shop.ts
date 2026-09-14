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

export const shop = {
    dropLabel: "Drop 001 · Founding kit",
    tagline: "Reserve at sesh. Pickup at sesh.",
    intro:
      "The first wave of Sunset Duckies kit. Small-run kit for surf families in Tamarin. Reserve a piece for your duckie and grab it at the Monday or Friday session.",
    steps: [
      {
        title: "Pick a piece",
        text: "Every card opens a quick reservation form: name, kid's name, size, qty. No checkout, no card.",
      },
      {
        title: "Lock it in",
        text: "The club confirms availability, price, and pickup details before fulfilling your reservation.",
      },
      {
        title: "Grab at sesh",
        text: "Pickup at Monday or Friday session, 4-6pm, Tamarin Bay. Andras hands it over on the beach.",
      },
    ],
    notes: [
      "Availability and pickup timing are confirmed by the club.",
      "Kids sizes 4-14 · adult sizes XS-XXL on most apparel.",
      "Product sales and club membership are accounted for separately.",
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
  };

import { starterNames, starterPackIds, starterRecipe, type StarterPackId } from "../lib/granola";

// The shop sells the granola: three flavours in 300 g pouches. Name, weight and
// price come from the recipes in src/lib/granola.ts, so the simulator and the
// shelf never disagree; the artwork is the pouch in src/lib/granola-pouch.ts.
type ProductColor = "cream" | "teal" | "sun" | "coral" | "lilac" | "ink";

type Product = {
  readonly id: StarterPackId;
  readonly name: string;
  readonly tagline: string;
  readonly price: number;
  readonly priceLabel: string;
  readonly color: ProductColor;
  readonly kind: string;
  readonly grams: number;
  readonly description: string;
  readonly imageAlt: string;
  readonly featured?: boolean;
};

const copy: Record<StarterPackId, Pick<Product, "tagline" | "description" | "imageAlt" | "featured">> = {
  "the-og": {
    tagline: "The original · oats, almonds, raisins",
    description: "The one that started it: oats, almonds, raisins and honey, baked in small batches in Tamarin until the clusters go golden. Breakfast, lunchbox, post-sesh handful.",
    imageAlt: "Cream Sunset Duckies granola pouch, The OG: a yellow sun, a palm and Le Morne over coral waves, with a window of golden granola.",
    featured: true,
  },
  "dawn-patrol": {
    tagline: "Seed-forward · for the early session",
    description: "Oats, sunflower seeds, almonds, raisins and honey. Made for the mornings that start before the sun does — grab a handful on the way to the beach.",
    imageAlt: "Pale blue Sunset Duckies granola pouch, Dawn Patrol: palms, a moon, twin peaks and a surfer on the beach over teal waves.",
  },
  "power-up": {
    tagline: "Double almonds · the generous one",
    description: "The same honey-baked oats with twice the almonds. Crunchier, nuttier, and the bag that empties first at the bonfire.",
    imageAlt: "Sage Sunset Duckies granola pouch, Power Up: tropical leaves, a pink sun and a red hibiscus over green waves.",
  },
};

const rupees = (amount: number) => `Rs ${amount.toLocaleString("en-US")}`;

const products: readonly Product[] = starterPackIds.map((id) => {
  const recipe = starterRecipe(id);
  return {
    id,
    name: starterNames[id],
    price: recipe.price,
    priceLabel: rupees(recipe.price),
    color: "cream",
    kind: "Granola",
    grams: recipe.packGrams,
    ...copy[id],
  };
});

export const shop = {
    dropLabel: "Drop 001 · Granola",
    tagline: "Reserve at sesh. Pickup at sesh.",
    intro:
      "Sunset Duckies granola, baked in Tamarin by the club's families. Three flavours, 300 g pouches, small batches. Reserve a bag and pick it up at the Monday or Friday session.",
    steps: [
      {
        title: "Pick a flavour",
        text: "Every pouch opens a quick reservation form: your name, how many bags, a kid's name if it's for a lunchbox. No checkout, no card.",
      },
      {
        title: "Lock it in",
        text: "The club confirms the batch, the price and the pickup day before baking your bags.",
      },
      {
        title: "Grab at sesh",
        text: "Pickup at the Monday or Friday session, 4-6pm, Tamarin Bay. Andras hands it over on the beach.",
      },
    ],
    notes: [
      "Baked to order in small batches; pickup timing is confirmed by the club.",
      "Contains oats, almonds and honey. Made in a kitchen that handles nuts.",
      "Granola sales and club membership are accounted for separately.",
    ],
    // What /shop shows anyone who is not a signed-in club member.
    comingSoon: {
      kicker: "Drop 001 · Coming soon",
      lead:
        "Sunset Duckies granola: three flavours, baked in small batches in Tamarin by the club's families, in 300 g pouches. The first drop is for club members and goes on sale at Cup Vol. 02.",
      memberNote: "Already a member? Sign in and the drop is yours to reserve.",
      joinNote: "Membership funds the kids' sessions; the granola is one of the perks.",
    },
    teaserProductIds: [...starterPackIds],
    products,
  };

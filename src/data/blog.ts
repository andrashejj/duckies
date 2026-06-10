import type { ShareConfig } from "../lib/share-media";

// The club logbook. Each post's media lives in a Nextcloud public share;
// at build time we enumerate the share (src/lib/share-media.ts) and hotlink
// server-side-resized previews. `media.files` is the offline fallback list —
// regenerate it with `bash scripts/list-share-media.sh <token>` on a network
// that can reach owncloud.justnet.pl and paste the output.

export interface BlogPostSection {
  emoji: string;
  title: string;
  accent: string;
  body: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  titleAccent: string;
  kicker: string;
  dateLabel: string;
  dateISO: string;
  location: string;
  excerpt: string;
  facts: { emoji: string; value: string; label: string }[];
  intro: string[];
  sections: BlogPostSection[];
  outro: string;
  media: ShareConfig & { shareUrl: string };
}

export const blog = {
  name: "The Logbook",
  tagline:
    "Field notes from the club — trips, comps, and the days that didn't fit the Monday/Friday rhythm.",
  posts: [
    {
      slug: "le-morne-reef-tour",
      title: "Duckies on tour:",
      titleAccent: "the Le Morne reef",
      kicker: "Club trip · Vol. 01",
      dateLabel: "June 2026",
      dateISO: "2026-06-10",
      location: "Le Morne, Mauritius",
      excerpt:
        "We swapped the Tamarin shorebreak for a boat day at the island's wildest corner — snorkelling over the Le Morne reef, watching One Eye peel, and learning what the mountain remembers.",
      facts: [
        { emoji: "🚤", value: "Boat day", label: "down the west coast" },
        { emoji: "📍", value: "Le Morne", label: "south-west tip" },
        { emoji: "🤿", value: "Reef snorkel", label: "lagoon + passes" },
        { emoji: "🌊", value: "One Eye", label: "a world-class left" },
      ],
      intro: [
        "Most weeks the club rhythm is simple: Monday and Friday, 4pm, Tamarin Bay, whitewater reps until the sun drops. This time we broke the routine — we loaded the duckies onto a boat and pointed it south, to the corner of the island where the reef goes wild.",
        "Le Morne is only a short run down the coast from Tamarin, but it feels like a different planet: a giant basalt mountain falling straight into a turquoise lagoon, a reef wrapped all the way around it, and some of the best waves and kite water anywhere on Earth.",
      ],
      sections: [
        {
          emoji: "🚤",
          title: "Down the coast",
          accent: "sticker-teal",
          body: "The trip itself is half the fun. Out of the bay, past the salt pans and the fishing boats, with the mountain growing bigger the whole way down. By the time we crossed into the Le Morne lagoon the water had turned that unreasonable shade of blue and every duckie was hanging off the side calling out fish.",
        },
        {
          emoji: "🐠",
          title: "Faces in the water",
          accent: "sticker-sun",
          body: "Masks on, fins on, over the side. The reef here is alive — parrotfish chewing coral, needlefish hanging just under the surface, the odd squeal through a snorkel when something bigger cruised past. Half the crew didn't want to get back on the boat.",
        },
        {
          emoji: "🌊",
          title: "Wave school, no paddling required",
          accent: "sticker-coral",
          body: "Near the passes we sat and watched One Eye do its thing — one of the best lefts in the world, breaking over the same kind of reef the kids had just been swimming over. Two sessions a week in the Tamarin whitewater leads somewhere, and the duckies got to see exactly where.",
        },
        {
          emoji: "⛰️",
          title: "What the mountain remembers",
          accent: "sticker-lilac",
          body: "Le Morne Brabant isn't just a backdrop — it's a UNESCO World Heritage site, once a refuge for escaped slaves who chose its cliffs over capture. We took a quiet minute under it. Surfing here is a privilege, and knowing the story of the place is part of being a local crew.",
        },
      ],
      outro:
        "Back in the bay by sunset, salty and fried, with a boatload of new fish facts and a new answer to “why do we train twice a week?” — because one day, that reef. Scroll the photos below, and come say hi on WhatsApp if your duckie wants in on the next trip.",
      media: {
        shareUrl: "https://owncloud.justnet.pl/index.php/s/jZtkwTHpCzoxHaB",
        base: "https://owncloud.justnet.pl",
        token: "jZtkwTHpCzoxHaB",
        // Offline fallback — empty until generated; the build enumerates the
        // share live, so the gallery fills itself wherever the host is
        // reachable (e.g. the Vercel build).
        files: [],
      },
    },
  ] as BlogPost[],
};

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
        "Monday and Friday, 4pm, Tamarin Bay. This time we loaded the duckies onto a boat and pointed south.",
        "Le Morne: basalt mountain, turquoise lagoon, the best waves on the island — about 40 minutes down the coast.",
      ],
      sections: [
        {
          emoji: "🚤",
          title: "Down the coast",
          accent: "sticker-teal",
          body: "Out of the bay, past the salt pans and fishing boats, the mountain growing the whole way down. By the time we crossed into the Le Morne lagoon every duckie was hanging off the side calling out fish.",
        },
        {
          emoji: "🐠",
          title: "Faces in the water",
          accent: "sticker-sun",
          body: "Masks on, fins on, over the side. Parrotfish, needlefish, the odd squeal when something bigger cruised past. Half the crew didn't want to get back on the boat.",
        },
        {
          emoji: "🌊",
          title: "Wave school, no paddling required",
          accent: "sticker-coral",
          body: "Near the passes we watched One Eye peel — one of the best lefts alive, over the same reef the kids had just been swimming. Two sessions a week in the Tamarin whitewater leads exactly here.",
        },
        {
          emoji: "⛰️",
          title: "What the mountain remembers",
          accent: "sticker-lilac",
          body: "Le Morne Brabant is a UNESCO Heritage site — once a refuge for escaped slaves who chose its cliffs over capture. We took a quiet minute under it. Knowing the story is part of being a local crew.",
        },
      ],
      outro:
        “Back in the bay by sunset, salty and fried. New answer to “why do we train twice a week?” — because one day, that reef.”,
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

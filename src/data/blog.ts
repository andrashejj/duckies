import type { ShareConfig } from "../lib/share-media";
import { site } from "./site";

// The club logbook. Each post's media lives in a Nextcloud public share;
// at build time we enumerate the share (src/lib/share-media.ts) and hotlink
// server-side-resized previews. `media.files` is the offline fallback list —
// regenerate it with `bash scripts/list-share-media.sh <token>` on a network
// that can reach owncloud.justnet.pl and paste the output.

export interface BlogIllustration {
  src: string;
  alt: string;
  caption: string;
}

export interface BlogGif {
  src: string;
  poster: string;
  alt: string;
  caption: string;
  sourceUrl: string;
  credit: string;
  width: number;
  height: number;
}

export interface BlogPostSection {
  title: string;
  accent: "coral" | "teal" | "sun" | "pink" | "lilac";
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
  facts: { value: string; label: string }[];
  intro: string[];
  sections: BlogPostSection[];
  outro: string;
  heroImage?: string;
  cover?: BlogIllustration;
  storyImage?: BlogIllustration;
  gif?: BlogGif;
  heroGlyphs?: string;
  cta: {
    kicker: string;
    title: string;
    titleAccent: string;
    body: string;
    primary: { label: string; href: string; external?: boolean };
    secondary?: { label: string; href: string };
  };
  media?: ShareConfig & { shareUrl: string };
}

export const blog = {
  name: "The Logbook",
  tagline:
    "Field notes from the club — trips, comps, and the days that didn't fit the Monday/Friday rhythm.",
  posts: [
    {
      slug: "new-semester-2026",
      title: "We're back:",
      titleAccent: "new semester, new rules",
      kicker: "Club update · Vol. 03",
      dateLabel: "September 2026",
      dateISO: "2026-09-03",
      location: "Tamarin, Mauritius",
      excerpt:
        "One open kickoff, semester membership, one parent from every family in the water, Estelle joining the brand work, and a competition planned for October.",
      facts: [
        { value: "11 Sep", label: "kickoff · 4-6pm · open to all" },
        { value: "Rs 3k / 5k", label: "one kid / family · semester" },
        { value: "1 parent", label: "every family · in the water" },
        { value: "October", label: "next competition planned" },
      ],
      intro: [
        "Hope you had a great summer. We missed you soo much. Looking down, I think my belly could also use some training :D. So let's get down to business.",
      ],
      sections: [
        {
          title: "Membership is a commitment",
          accent: "teal",
          body: "Membership is Rs 3,000 per semester for one child, or Rs 5,000 for a family. The fee is part of a commitment from all of us: we take the club seriously, and we need the duckies and parents to do the same. After the kickoff, our regular Monday and Friday training from 4-6pm will be for members only.",
        },
        {
          title: "Everyone is invited on 11 September",
          accent: "sun",
          body: "We are starting the semester with a kickoff on Friday 11 September from 4-6pm. This session is open to everyone, and it can be the free first session for new duckies. We had too many gnarly situations last semester, so every family must have at least one parent or guardian in the water for the full session, including that first one. We will share the final details in the WhatsApp group.",
        },
        {
          title: "Estelle is joining the brand crew",
          accent: "coral",
          body: "Estelle, the daughter of a good friend of mine from Switzerland, is travelling to Mauritius for an internship with Sunset Duckies. Yes, we are officially importing Swiss talent :D. She will help us take the brand to the next level and contact everyone who joins the club.",
        },
        {
          title: "A competition is coming in October",
          accent: "lilac",
          body: "We are planning the next Sunset Duckies competition for October. The date and format are still being worked out, and we will share them as soon as they are ready.",
        },
      ],
      outro:
        "For now, save Friday 11 September. If you join the club, expect a hello from Estelle too.",
      cover: {
        src: "/media/logbook/semester-cover.webp",
        alt: "The Sunset Duckies crew with their boards on Tamarin beach at dusk.",
        caption: "The crew, the boards, the last light. Monday and Friday, from 11 September.",
      },
      storyImage: {
        src: "/media/logbook/semester-water.webp",
        alt: "A parent wades into the shallows with a board while Duckies play in the water behind.",
        caption: "One parent from every family in the water. That is the deal.",
      },
      gif: {
        src: "/media/logbook/surfing-duck.gif",
        poster: "/media/logbook/surfing-duck-poster.webp",
        alt: "A yellow cartoon duck surfing a little wave.",
        caption: "Current mood: back on the board.",
        sourceUrl: "https://tenor.com/view/duck-surfing-gif-11348510",
        credit: "Duck Surfing · Tenor",
        width: 240, height: 240,
      },
      heroGlyphs: "🌅 → 🦆 → 🏆",
      cta: {
        kicker: "Kickoff + membership",
        title: "Come back to the",
        titleAccent: "water",
        body: "Join the WhatsApp group for the kickoff details. Everyone who joins the club will also hear from Estelle during her internship.",
        primary: { label: "Open the WhatsApp group", href: site.whatsappUrl, external: true },
        secondary: { label: "How membership works", href: "/#how-to-join" },
      },
    },
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
        { value: "Boat day", label: "down the west coast" },
        { value: "Le Morne", label: "south-west tip" },
        { value: "Reef snorkel", label: "lagoon + passes" },
        { value: "One Eye", label: "a world-class left" },
      ],
      intro: [
        "Monday and Friday, 4pm, Tamarin Bay. This time we loaded the duckies onto a boat and pointed south.",
        "Le Morne: basalt mountain, turquoise lagoon, the best waves on the island — about 40 minutes down the coast.",
      ],
      sections: [
        {
          title: "Down the coast",
          accent: "teal",
          body: "Out of the bay, past the salt pans and fishing boats, the mountain growing the whole way down. By the time we crossed into the Le Morne lagoon every duckie was hanging off the side calling out fish.",
        },
        {
          title: "Faces in the water",
          accent: "sun",
          body: "Masks on, fins on, over the side. Parrotfish, needlefish, the odd squeal when something bigger cruised past. Half the crew didn't want to get back on the boat.",
        },
        {
          title: "Wave school, no paddling required",
          accent: "coral",
          body: "Near the passes we watched One Eye peel — one of the best lefts alive, over the same reef the kids had just been swimming. Two sessions a week in the Tamarin whitewater leads exactly here.",
        },
        {
          title: "What the mountain remembers",
          accent: "lilac",
          body: "Le Morne Brabant is a UNESCO Heritage site — once a refuge for escaped slaves who chose its cliffs over capture. We took a quiet minute under it. Knowing the story is part of being a local crew.",
        },
      ],
      outro:
        'Back in the bay by sunset, salty and fried. New answer to “why do we train twice a week?” — because one day, that reef.',
      cover: {
        src: "/media/logbook/reef-cover.webp",
        alt: "Drone view of Duckies and their coach sitting on boards over the turquoise Little Reef.",
        caption: "The lineup from above: Duckies on the reef, 4 June.",
      },
      heroGlyphs: "⛰️ → 🚤 → 🤿",
      cta: {
        kicker: "Next trip",
        title: "Your duckie on the",
        titleAccent: "next boat?",
        body: "Club trips are for members, and joining is four short steps. Say hi in the WhatsApp group and we'll take it from there.",
        primary: { label: "Join the crew", href: site.whatsappUrl, external: true },
        secondary: { label: "How to join the club", href: "/#join" },
      },
      media: {
        // The trip lives in the same share as the Cup album (the original
        // jZtkwTHpCzoxHaB share is password-protected now). Stills only: the
        // folder's 4K drone originals are cut for /gallery instead of being
        // streamed from Nextcloud.
        shareUrl: "https://owncloud.justnet.pl/index.php/s/Doz36QepJBNrmfc",
        base: "https://owncloud.justnet.pl",
        token: "Doz36QepJBNrmfc",
        path: "20260604 Little Reef Surfing/Part-1",
        imagesOnly: true,
        files: ["DJI_0503.JPG", "DJI_0513.JPG"],
      },
    },
    {
      slug: "project-molt-brand-exercise",
      title: "Project Molt:",
      titleAccent: "building the brand",
      kicker: "Brand exercise · Vol. 02",
      dateLabel: "August 2026",
      dateISO: "2026-08-29",
      location: "Tamarin, Mauritius",
      excerpt:
        "Sunset Duckies started as a surf club. Project Molt asks whether it can also become a product brand built around quality, local work and communities that can shape it for themselves.",
      facts: [
        { value: "4 ideas", label: "developed first" },
        { value: "1 product", label: "chosen from evidence" },
        { value: "31 Oct", label: "Tamarin launch" },
        { value: "28 Feb", label: "global plan" },
      ],
      intro: [
        "Sunset Duckies grew from afternoons in the water, families helping each other and kids learning to surf. We are now exploring whether that same community can build useful, high-quality products for surfers and surf families.",
        "We are calling the exercise Project Molt. Tamarin is the first test, but the aim is a model that other surf communities can make their own rather than a copy of Mauritius dropped somewhere else.",
      ],
      sections: [
        {
          title: "Start with four",
          accent: "teal",
          body: "We will develop four product ideas to the same level, put them in front of families, kids, likely buyers and makers, then choose one from what we learn. No favourite gets a head start.",
        },
        {
          title: "Make and launch one",
          accent: "sun",
          body: "The selected idea becomes a small proof of concept made with local people where possible. We will build interest before launching it alongside a surf competition at the end of October, then record what sold, what failed and what people would change.",
        },
        {
          title: "Learn what can travel",
          accent: "coral",
          body: "The Tamarin pilot runs through February. By then we need real product standards, working economics, a local handover model and a plan for how another surf community could start without losing its own identity.",
        },
      ],
      outro:
        "The first job is deliberately small: make the four product ideas equally clear by 7 September. The interviews and the evidence come next.",
      cover: {
        src: "/media/logbook/molt-cover.webp",
        alt: "Two Duckies on the beach holding a heart-shaped cake.",
        caption: "Something baked, something shared. The brand exercise starts from here.",
      },
      storyImage: {
        src: "/media/logbook/molt-workshop.webp",
        alt: "Four soft-top surfboards painted by the Duckies, seen from above.",
        caption: "Product design, Duckies edition: four boards, four artists, no brief.",
      },
      gif: {
        src: "/media/logbook/thinking-duck.gif",
        poster: "/media/logbook/thinking-duck-poster.webp",
        alt: "A cartoon duck raises an eyebrow, thinking it over.",
        caption: "When someone says they already know which idea will win.",
        sourceUrl: "https://tenor.com/view/huh-raised-eyebrow-hm-think-chris-p-duck-gif-11545850",
        credit: "Chris P. Duck · via Tenor",
        width: 498, height: 280,
      },
      heroGlyphs: "4 → 1 → 🌍",
      cta: {
        kicker: "The working brief",
        title: "Follow",
        titleAccent: "Project Molt",
        body: "The workspace holds the vision, the plan, the three weeks onsite and the working documents, from the first four ideas through the Tamarin pilot.",
        primary: { label: "Open the workspace", href: "/branding-plan" },
        secondary: { label: "See the four product areas", href: "/product-ideas" },
      },
    },
    {
      slug: "cup-vol-2-friday-16-october",
      title: "Cup Vol. 02:",
      titleAccent: "Friday 16 October",
      kicker: "Save the date · Vol. 02",
      dateLabel: "17 September 2026",
      dateISO: "2026-09-17",
      location: "Tamarin Bay, Mauritius",
      excerpt:
        "The second Sunset Duckies Cup is a Friday: 16 October, Tamarin Bay. Heats for every level, crowns for the Duckie King and Queen, a grey goose heat for the parents — and something cooking for the day.",
      facts: [
        { value: "Fri 16 Oct", label: "one day, Tamarin Bay" },
        { value: "Heats of 4", label: "every level surfs" },
        { value: "Grey goose", label: "the parents' heat" },
        { value: "Fri 25 Sep", label: "registration opens" },
      ],
      intro: [
        "Vol. 01 was a Sunday in May: rashies, heats, a BBQ and a bonfire that went on longer than planned. Vol. 02 takes the Friday training slot and turns it into a whole afternoon.",
        "Same beach, sharpened by everything the first Cup taught us — colour-coded rashies, four to a heat, an earlier start, gazebos and more food.",
      ],
      sections: [
        {
          title: "Every Duckie surfs",
          accent: "coral",
          body: "Divisions by age, a heat for everyone, prizes for more than the best wave. Ducklings get playful tick-box scoring; ducks get real points. Nobody sits on the sand all afternoon.",
        },
        {
          title: "The grey goose heat",
          accent: "teal",
          body: "One heat for the parents. Same rules, same judges, considerably less grace. If you have been paddling out at Le Morne on Sunday mornings, this is where it counts.",
        },
        {
          title: "Something is in the oven",
          accent: "sun",
          body: "The club is cooking something for the day — literally. First taste for club families at Friday training in two weeks; the full reveal is at the Cup, before the crowns.",
        },
        {
          title: "Registration opens 25 September",
          accent: "pink",
          body: "Sign-up goes out in the parents' WhatsApp group next Friday. Judges, beach marshals and BBQ hands: we need you too, and the volunteer roles are on the Cup page.",
        },
      ],
      outro:
        "Block the afternoon, tell the grandparents, and see you Friday in the water.",
      cover: {
        src: "/media/logbook/cup-vol-2-cover.webp",
        alt: "The whole club lined up behind their colourful surfboards on Tamarin beach at sunset.",
        caption: "The lineup after a Friday session. Multiply by a Cup.",
      },
      heroGlyphs: "🏆 → 🦆 → 🔥",
      cta: {
        kicker: "Cup Vol. 02",
        title: "Everything about",
        titleAccent: "the day",
        body: "Format, divisions, what changed since Vol. 01 and the volunteer roles are on the Cup page. Registration is in the WhatsApp group from 25 September.",
        primary: { label: "The Cup Vol. 02 page", href: "/sunset-duckies-cup-vol-2" },
        secondary: { label: "The gallery (members)", href: "/gallery" },
      },
    },
    {
      slug: "le-morne-dawn-patrol",
      title: "Dawn patrol:",
      titleAccent: "the parents at Le Morne",
      kicker: "Grey goose training · July",
      dateLabel: "July 2026",
      dateISO: "2026-07-12",
      location: "Le Morne, Mauritius",
      excerpt:
        "One Sunday in July the parents drove south early, paddled out under the mountain and put a drone up. The Duckies had the beach. Everyone came home happy.",
      facts: [
        { value: "Sun 12 Jul", label: "one early session" },
        { value: "Le Morne", label: "under the mountain" },
        { value: "4K", label: "from the drone" },
        { value: "0 kids", label: "in the lineup" },
      ],
      intro: [
        "Sunset Duckies is a club for kids. It is also, quietly, a club for their parents — the ones who stand in the whitewater every Monday and Friday and never get a wave of their own.",
        "So on 12 July a handful of them left Tamarin early, parked under Le Morne Brabant and paddled out before the wind.",
      ],
      sections: [
        {
          title: "Under the mountain",
          accent: "teal",
          body: "Glassy, green and a little bigger than it looked from the beach. Long lefts peeling over the reef with the mountain filling the sky behind — the wave the reef tour showed the Duckies from a boat in June.",
        },
        {
          title: "The drone's view",
          accent: "sun",
          body: "A DJI over the lineup at 4K: Arjon, David, Teo and Andras each got a wave on camera. The best frames are on the gallery page and the clips will show up on Instagram in the run-up to the Cup.",
        },
        {
          title: "Meanwhile, on the beach",
          accent: "coral",
          body: "Bron had the Duckies on the sand — a beach that looks, from above, like a postcard nobody would believe. Sandcastles and an empty lagoon while the parents surfed.",
        },
        {
          title: "Why it matters",
          accent: "lilac",
          body: "The grey goose heat at Cup Vol. 02 is one heat for the parents, same rules, same judges. Consider this the training log. Bring your best Le Morne wave to Tamarin on 16 October.",
        },
      ],
      outro:
        "Back in Tamarin with sand in the car and Duckies asking when it is their turn. Soon.",
      cover: {
        src: "/media/logbook/le-morne-dawn-cover.webp",
        alt: "Drone view over the Le Morne lagoon at sunrise, a surfer paddling and the mountain behind.",
        caption: "The lineup from above, 12 July, before the wind.",
      },
      heroGlyphs: "🌄 → 🏄 → 🚁",
      cta: {
        kicker: "Cup Vol. 02",
        title: "The grey goose heat",
        titleAccent: "is on 16 October",
        body: "One heat for the parents at Cup Vol. 02, Friday 16 October at Tamarin Bay. Registration opens in the WhatsApp group on 25 September.",
        primary: { label: "The Cup Vol. 02 page", href: "/sunset-duckies-cup-vol-2" },
        secondary: { label: "See the gallery", href: "/gallery" },
      },
    },
  ] as BlogPost[],
};

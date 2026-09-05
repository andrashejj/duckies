import type { ShareConfig } from "../lib/share-media";
import { site } from "./site";

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
  heroImage?: string;
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
        { emoji: "🌅", value: "11 Sep", label: "kickoff · 4-6pm · open to all" },
        { emoji: "🦆", value: "Rs 3k / 5k", label: "one kid / family · semester" },
        { emoji: "🌊", value: "1 parent", label: "every family · in the water" },
        { emoji: "🏆", value: "October", label: "next competition planned" },
      ],
      intro: [
        "Hope you had a great summer. We missed you soo much. Looking down, I think my belly could also use some training :D. So let's get down to business.",
      ],
      sections: [
        {
          emoji: "01",
          title: "Membership is a commitment",
          accent: "sticker-teal",
          body: "Membership is Rs 3,000 per semester for one child, or Rs 5,000 for a family. The fee is part of a commitment from all of us: we take the club seriously, and we need the duckies and parents to do the same. After the kickoff, our regular Monday and Friday training from 4-6pm will be for members only.",
        },
        {
          emoji: "02",
          title: "Everyone is invited on 11 September",
          accent: "sticker-sun",
          body: "We are starting the semester with a kickoff on Friday 11 September from 4-6pm. This session is open to everyone, and it can be the free first session for new duckies. We had too many gnarly situations last semester, so every family must have at least one parent or guardian in the water for the full session, including that first one. We will share the final details in the WhatsApp group.",
        },
        {
          emoji: "03",
          title: "Estelle is joining the brand crew",
          accent: "sticker-coral",
          body: "Estelle, the daughter of a good friend of mine from Switzerland, is travelling to Mauritius for an internship with Sunset Duckies. Yes, we are officially importing Swiss talent :D. She will help us take the brand to the next level and contact everyone who joins the club.",
        },
        {
          emoji: "04",
          title: "A competition is coming in October",
          accent: "sticker-lilac",
          body: "We are planning the next Sunset Duckies competition for October. The date and format are still being worked out, and we will share them as soon as they are ready.",
        },
      ],
      outro:
        "For now, save Friday 11 September. If you join the club, expect a hello from Estelle too.",
      heroImage: "/media/sunset-training.jpg",
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
        'Back in the bay by sunset, salty and fried. New answer to “why do we train twice a week?” — because one day, that reef.',
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
        shareUrl: "https://owncloud.justnet.pl/index.php/s/jZtkwTHpCzoxHaB",
        base: "https://owncloud.justnet.pl",
        token: "jZtkwTHpCzoxHaB",
        // Offline fallback — empty until generated; the build enumerates the
        // share live, so the gallery fills itself wherever the host is
        // reachable (e.g. the Vercel build).
        files: [],
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
        { emoji: "◉", value: "4 ideas", label: "developed first" },
        { emoji: "↘", value: "1 product", label: "chosen from evidence" },
        { emoji: "◎", value: "31 Oct", label: "Tamarin launch" },
        { emoji: "↗", value: "28 Feb", label: "global plan" },
      ],
      intro: [
        "Sunset Duckies grew from afternoons in the water, families helping each other and kids learning to surf. We are now exploring whether that same community can build useful, high-quality products for surfers and surf families.",
        "We are calling the exercise Project Molt. Tamarin is the first test, but the aim is a model that other surf communities can make their own rather than a copy of Mauritius dropped somewhere else.",
      ],
      sections: [
        {
          emoji: "01",
          title: "Start with four",
          accent: "sticker-teal",
          body: "We will develop four product ideas to the same level, put them in front of families, kids, likely buyers and makers, then choose one from what we learn. No favourite gets a head start.",
        },
        {
          emoji: "02",
          title: "Make and launch one",
          accent: "sticker-sun",
          body: "The selected idea becomes a small proof of concept made with local people where possible. We will build interest before launching it alongside a surf competition at the end of October, then record what sold, what failed and what people would change.",
        },
        {
          emoji: "03",
          title: "Learn what can travel",
          accent: "sticker-coral",
          body: "The Tamarin pilot runs through February. By then we need real product standards, working economics, a local handover model and a plan for how another surf community could start without losing its own identity.",
        },
      ],
      outro:
        "The first job is deliberately small: make the four product ideas equally clear by 7 September. The interviews and the evidence come next.",
      heroImage: "/media/young-rider.jpg",
      heroGlyphs: "4 → 1 → 🌍",
      cta: {
        kicker: "The working brief",
        title: "Follow",
        titleAccent: "Project Molt",
        body: "The project page contains the goals, deadlines, decision gates and templates we will use from the first four ideas through the Tamarin pilot.",
        primary: { label: "Read the project brief", href: "/branding-plan" },
        secondary: { label: "See the four product areas", href: "/product-ideas" },
      },
    },
  ] as BlogPost[],
};

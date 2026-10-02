import type { BlogPost } from "./blog";

export const cupContentPlan: BlogPost = {
  slug: "granola-cup-october-content-plan",
  title: "Why we do this",
  titleAccent: "walking selfie videos",
  kicker: "Project Molt · October 2026",
  dateLabel: "2 October 2026",
  dateISO: "2026-10-02",
  location: "Tamarin, Mauritius",
  excerpt: "Quick and easy: a selfie video while walking, in the Duckies shirt, where each of us says why we do this. One take, 30 to 45 seconds, no editing.",
  facts: [
    { value: "5 + interviews", label: "Noah, Lara, Estelle, Tamas, Dori, plus Estelle’s interviews" },
    { value: "1 take", label: "walking and talking" },
    { value: "30–45 sec", label: "no script, no edit" },
    { value: "1 phone", label: "arm’s length" },
  ],
  cover: {
    src: "/media/logbook/cup-content-plan-photo.webp",
    alt: "Photorealistic scene of a phone filming hands mixing granola, with a tray and a three-scene storyboard on the table.",
    caption: "A phone and a story. AI-generated cover scene.",
  },
  intro: [
    "Every video asks one question: why do we do this? Wear the shirt, hold the phone at arm’s length, walk, and answer in your own words.",
    "Start with “Hi, I’m ___, and we do Sunset Duckies because…” and keep going. Two takes at most, keep the better one, and post it as it is.",
  ],
  sections: [
    { title: "Noah", accent: "coral", body: "What the surf club gives the kids." },
    { title: "Lara", accent: "teal", body: "What it is like from the water or beach side." },
    { title: "Estelle", accent: "sun", body: "Why she came from Switzerland to help." },
    { title: "Tamas", accent: "pink", body: "Why he started and keeps building this." },
    { title: "Dori", accent: "lilac", body: "What she sees in the kids and families." },
    { title: "Interviews", accent: "coral", body: "Estelle with Abiguelle and the community hosts: the same walking selfie, but the other person answers why." },
  ],
  outro: "End with “see you at the Cup” or “join us”. Cup Vol. 02 is on Friday 16 October at Tamarin Bay.",
  cta: {
    kicker: "Friday 16 October",
    title: "Join us at",
    titleAccent: "Tamarin Bay",
    body: "The Cup page has the current programme, entry details and registration information. Friends and family are welcome to come and cheer.",
    primary: { label: "See the Cup details", href: "/sunset-duckies-cup-vol-2" },
    secondary: { label: "More from the Logbook", href: "/blog" },
  },
};

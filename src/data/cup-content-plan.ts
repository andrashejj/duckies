import type { BlogPost } from "./blog";
import { cupContentSchedule } from "./cup-content-schedule";

export const cupContentPlan: BlogPost = {
  slug: "granola-cup-october-content-plan",
  title: "Granola and the Cup",
  titleAccent: "our two week content plan",
  kicker: "Project Molt · October 2026",
  dateLabel: "2 October 2026",
  dateISO: "2026-10-02",
  location: "Tamarin, Mauritius",
  excerpt: "One short video every day, from 2 to 18 October. The Cup, the granola, and four glimpses of Estelle’s internship: conversations with Abiguelle and everyday life with local communities. Each video is 30 seconds or less.",
  facts: [
    { value: "16 Oct", label: "Cup Vol. 02 · Tamarin Bay" },
    { value: "17 videos", label: "one every day · 2–18 Oct" },
    { value: "30 sec max", label: "one moment, one question" },
    { value: "1 phone", label: "and people from the club" },
  ],
  cover: {
    src: "/media/logbook/cup-content-plan-cover.webp",
    alt: "Illustration of a phone filming hands mixing granola, with a tray and a three-scene storyboard on the table.",
    caption: "A phone, a bowl of granola and a story to follow through to Cup day. Original illustration.",
  },
  intro: [],
  sections: [],
  contentPlan: cupContentSchedule,
  outro: "Start with the 2 October video. Capture one real moment, keep the finished edit under 30 seconds and save spare footage for the next day.",
  cta: {
    kicker: "Friday 16 October",
    title: "Join us at",
    titleAccent: "Tamarin Bay",
    body: "The Cup page has the current programme, entry details and registration information. Friends and family are welcome to come and cheer.",
    primary: { label: "See the Cup details", href: "/sunset-duckies-cup-vol-2" },
    secondary: { label: "More from the Logbook", href: "/blog" },
  },
};

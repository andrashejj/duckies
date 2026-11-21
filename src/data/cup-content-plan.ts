import type { BlogPost } from "./blog";

export const cupContentPlan: BlogPost = {
  slug: "granola-cup-october-content-plan",
  title: "Why we do this:",
  titleAccent: "short phone videos",
  kicker: "Project Molt · October 2026",
  dateLabel: "2 October 2026",
  dateISO: "2026-10-02",
  location: "Tamarin, Mauritius",
  excerpt: "Seven short phone videos before the Cup, each one a different person from the club saying why they do this, plus one of the granola being baked. No script, no fancy editing.",
  facts: [
    { value: "7 videos", label: "one per person" },
    { value: "30–45 sec", label: "one take each" },
    { value: "1 phone", label: "no script" },
    { value: "16 Oct", label: "Cup Vol. 02" },
  ],
  cover: {
    src: "/media/logbook/cup-content-plan-photo.webp",
    alt: "Photorealistic scene of a phone filming hands mixing granola, with a tray and a three-scene storyboard on the table.",
    caption: "A phone and a bowl of granola. AI-generated cover scene.",
  },
  intro: [
    "Most of these are selfie videos: you hold the phone at arm’s length, walk, and say in your own words why you’re part of Sunset Duckies. Start with “Hi, I’m ___ and I…”, do two takes at most, keep the better one.",
    "Estelle, our intern, collects the clips and runs each one through an AI video editor that cuts the pauses, adds captions and trims it to under 45 seconds. Estelle checks the result before Andras posts it. If the AI edit looks wrong, we post the raw clip instead. The baking video is the exception: Estelle films it while Abiguelle bakes.",
  ],
  sections: [
    { title: "Noah and Lara", accent: "coral", body: "Our kids, who surf and learn along the way. Each films their own selfie: what they like about surfing and what they’ve learned. A parent checks the video before it goes up." },
    { title: "Tamas", accent: "teal", body: "A dad in the club. Selfie: why they spend their time and money on this, and what they see in the kids." },
    { title: "Dori", accent: "sun", body: "The inventor of the granola. Selfie or short chat with Estelle: where the recipe came from and why granola." },
    { title: "Abiguelle", accent: "pink", body: "Helps bake the granola. Estelle films the baking, start to finish, with Abiguelle saying what they’re doing as they go." },
    { title: "Estelle", accent: "lilac", body: "Our intern. Selfie: why they came to Mauritius to work with the club, and what the first weeks were like." },
    { title: "Andras", accent: "coral", body: "The techie behind the website and the members app. Selfie: why a surf club needs one, and what it does for the families." },
  ],
  outro: "End each video with “see you at the Cup”. Cup Vol. 02 is on Friday 16 October at Tamarin Bay.",
  cta: {
    kicker: "Friday 16 October",
    title: "Join us at",
    titleAccent: "Tamarin Bay",
    body: "The Cup page has the current programme, entry details and registration information. Friends and family are welcome to come and cheer.",
    primary: { label: "See the Cup details", href: "/sunset-duckies-cup-vol-2" },
    secondary: { label: "More from the Logbook", href: "/blog" },
  },
};

// Photos on /gallery. Originals come from the members' WhatsApp group; the
// WebP derivatives live in public/media/gallery/ (see CREDITS.md there).

export type GalleryPhoto = { slug: string; alt: string; credit: string; date: string; w: number; h: number };
export type GallerySection = { id: string; title: string; lead: string; photos: GalleryPhoto[] };
export type GalleryClip = { slug: string; title: string; credit: string; date: string };

export const gallery = {
  name: "Gallery",
  tagline: "The club, in pictures. Real sessions, real Duckies, shot by the parents on the sand.",
  sections: [
    { id: "water", title: "In the water", lead: "Small waves, big grins. Every session ends with a ride to the sand.", photos: [
      { slug: "sunset-ride-arms-out", alt: "A Duckie rides a small evening wave towards the camera, arms out, under a sunset sky.", credit: "a club parent", date: "3 Apr 2026", w: 1200, h: 1600 },
      { slug: "standing-tall", alt: "A young surfer stands tall on a knee-high wave, the mountains behind.", credit: "a club parent", date: "10 Apr 2026", w: 1200, h: 1600 },
      { slug: "riding-the-shore", alt: "Riding a wave along the shore, filao trees behind.", credit: "a club parent", date: "10 Apr 2026", w: 1200, h: 1600 },
      { slug: "first-waves-blue-sky", alt: "A kid on a soft-top rides a small wave under blue sky and clouds.", credit: "a club parent", date: "3 Apr 2026", w: 1200, h: 1600 },
      { slug: "crouch-and-go", alt: "Crouched low on the board as the wave picks up.", credit: "a club parent", date: "10 Apr 2026", w: 1200, h: 1600 },
      { slug: "evening-glide", alt: "Evening glide across a glassy wave, sun rays on the water.", credit: "a club parent", date: "8 Apr 2026", w: 1600, h: 1200 },
      { slug: "pink-board-whitewater", alt: "Dragging a pink soft-top through the whitewater at sunset.", credit: "a club parent", date: "3 Apr 2026", w: 1200, h: 1600 },
      { slug: "three-on-the-inside", alt: "Three Duckies on small waves on the inside, one watching from the shallows.", credit: "a club parent", date: "10 Apr 2026", w: 1200, h: 1600 },
      { slug: "sunset-ride-arms-out-2", alt: "Same wave, arms wider: a Duckie riding towards the beach at sunset.", credit: "a club parent", date: "3 Apr 2026", w: 1200, h: 1600 },
      { slug: "wading-in", alt: "Wading in with boards on a grey morning.", credit: "Bron", date: "12 Mar 2026", w: 1280, h: 960 },
    ] },
    { id: "sand", title: "On the sand", lead: "Warm-ups, beach games and the board lineup before every session.", photos: [
      { slug: "board-lineup-sunset", alt: "The whole club lined up behind their colourful boards at sunset.", credit: "a club parent", date: "3 Apr 2026", w: 1600, h: 1200 },
      { slug: "crew-and-boards", alt: "The crew with their boards on the beach at dusk.", credit: "Arjon", date: "31 May 2026", w: 1600, h: 812 },
      { slug: "boards-under-the-mountain", alt: "Boards and Duckies on the sand with the mountain behind.", credit: "Karissa Nel", date: "1 Jun 2026", w: 1600, h: 920 },
      { slug: "filao-games", alt: "Beach games under the filao trees.", credit: "Kyrah Ashe", date: "15 May 2026", w: 1200, h: 1600 },
      { slug: "beach-run", alt: "Kids running across the beach under the filao trees.", credit: "Kyrah Ashe", date: "15 May 2026", w: 1200, h: 1600 },
      { slug: "sand-games", alt: "A beach game on the sand.", credit: "Arjon", date: "20 Jul 2026", w: 1600, h: 739 },
      { slug: "warm-up-circle", alt: "Warm-up circle on the sand under the big tree.", credit: "a club parent", date: "11 Mar 2026", w: 1600, h: 1200 },
      { slug: "into-the-dusk", alt: "Duckies carrying their boards into the water at dusk.", credit: "Pierre Lamboray", date: "11 Mar 2026", w: 1280, h: 960 },
    ] },
    { id: "golden", title: "Golden hour", lead: "Sunrise lineups and sunset paddle-outs. This is why the club is called what it is.", photos: [
      { slug: "sunrise-rays", alt: "Sun rays through the clouds over a lineup of surfers at dawn.", credit: "Holly", date: "12 Jul 2026", w: 1200, h: 1600 },
      { slug: "red-sun-lineup", alt: "A red sun on the horizon behind surfers waiting for a wave.", credit: "Holly", date: "12 Jul 2026", w: 1200, h: 1600 },
      { slug: "sunrise-sky", alt: "Sunrise over Tamarin Bay.", credit: "Holly", date: "18 Jul 2026", w: 1200, h: 1600 },
      { slug: "dawn-patrol", alt: "A kid carries a longboard into the water at dawn.", credit: "Holly", date: "18 Jul 2026", w: 1600, h: 1200 },
      { slug: "sunrise-rays-2", alt: "Golden light through the clouds over the morning lineup.", credit: "Holly", date: "12 Jul 2026", w: 1200, h: 1600 },
      { slug: "red-sun-wide", alt: "Red sun on the horizon, surfers in silhouette.", credit: "Holly", date: "12 Jul 2026", w: 1600, h: 1200 },
      { slug: "bonfire-at-sunset", alt: "A bonfire on the beach at sunset.", credit: "Abhishek Basu", date: "14 May 2026", w: 720, h: 960 },
      { slug: "evening-sun", alt: "The sun low over the sea, surfers far out.", credit: "Julie Morelle", date: "5 Jun 2026", w: 1280, h: 960 },
      { slug: "sunset-silhouette", alt: "A sunset silhouette at the water's edge.", credit: "Kyrah Ashe", date: "15 Apr 2026", w: 1200, h: 1600 },
    ] },
    { id: "bonfire", title: "Bonfire nights", lead: "Semester wrap-ups and Cup evenings end the same way: a fire on the sand.", photos: [
      { slug: "bonfire-circle", alt: "Families around a beach bonfire at dusk.", credit: "Vincent van Rooyen", date: "17 Jul 2026", w: 960, h: 1280 },
      { slug: "sparks", alt: "Sparks from the bonfire against the evening sky.", credit: "Vincent van Rooyen", date: "17 Jul 2026", w: 960, h: 1280 },
      { slug: "bonfire-blue-hour", alt: "The bonfire at blue hour.", credit: "Bron", date: "18 Jul 2026", w: 1280, h: 960 },
      { slug: "bonfire-faces", alt: "Duckies around the fire.", credit: "Peter K", date: "15 May 2026", w: 1600, h: 1200 },
      { slug: "bonfire-crew", alt: "The crew lined up by the fire.", credit: "Bron", date: "18 Jul 2026", w: 1280, h: 960 },
      { slug: "painted-boards", alt: "Four soft-top boards painted by the Duckies, seen from above.", credit: "Andras Hejj", date: "5 May 2026", w: 1600, h: 1200 },
      { slug: "heart-cake", alt: "Two Duckies holding a heart-shaped cake.", credit: "Bron", date: "10 Jul 2026", w: 1200, h: 1600 },
    ] },
    { id: "le-morne", title: "Le Morne, from above", lead: "12 July: the parents paddled out under the mountain before the wind and put a drone up. The Duckies had the beach.", photos: [
      { slug: "le-morne-sunrise", alt: "Drone view over the Le Morne lagoon at sunrise, a lone surfer on a small wave and the mountain behind.", credit: "club drone", date: "12 Jul 2026", w: 1600, h: 844 },
      { slug: "le-morne-green-wall", alt: "A surfer rides a glassy green wave at Le Morne, seen from the drone.", credit: "club drone", date: "12 Jul 2026", w: 1600, h: 844 },
      { slug: "le-morne-arjon-drop", alt: "A surfer on a red board drops into a Le Morne wave, whitewater behind.", credit: "club drone", date: "12 Jul 2026", w: 1600, h: 844 },
      { slug: "le-morne-point-from-above", alt: "The sandy point at Le Morne from above: turquoise lagoon, filao trees and a small boat.", credit: "club drone", date: "12 Jul 2026", w: 1600, h: 844 },
      { slug: "le-morne-sandcastles", alt: "Two Duckies and a parent on the empty Le Morne beach, seen from the drone.", credit: "club drone", date: "12 Jul 2026", w: 1600, h: 844 },
      { slug: "reef-foam-from-above", alt: "Whitewater spreading over the Le Morne reef, seen from a low-flying drone.", credit: "club drone", date: "12 Jul 2026", w: 1600, h: 844 },
    ] },
  ] satisfies GallerySection[],
  clips: [
    { slug: "long-ride", title: "A long ride to the sand", credit: "Bron", date: "22 Apr 2026" },
    { slug: "three-on-a-wave", title: "Three on one wave", credit: "Bron", date: "22 Apr 2026" },
    { slug: "coach-push", title: "Coach push-off", credit: "Bron", date: "10 Jul 2026" },
    { slug: "bonfire", title: "Bonfire", credit: "Arjon", date: "18 Jul 2026" },
    { slug: "le-morne-arjon", title: "Le Morne, the parents' turn", credit: "club drone", date: "12 Jul 2026" },
    { slug: "le-morne-from-above", title: "The beach from above", credit: "club drone", date: "12 Jul 2026" },
  ] satisfies GalleryClip[],
};

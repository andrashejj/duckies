// The granola pouch: one drawing shared by the shop (product artwork), the
// branding simulator (the pack cards) and anywhere else a pouch is shown.
// Three printed flavours — The OG, Dawn Patrol, Power Up — and the blank "?"
// pouch a new recipe wears until it has a design of its own. Inline SVG so the
// site's fonts print the labels (Outfit wordmark, Fraunces italic flavour,
// JetBrains Mono tags); every colour is a token from global.css.

export const POUCH_FLAVOURS = ["the-og", "dawn-patrol", "power-up"] as const;
export type PouchFlavour = (typeof POUCH_FLAVOURS)[number];
export type PouchDesign = PouchFlavour | "new";
export const isPouchFlavour = (value: string): value is PouchFlavour => (POUCH_FLAVOURS as readonly string[]).includes(value);

export const POUCH_VIEWBOX = "0 0 340 560";
const v = (token: string) => `var(--pouch-${token})`;
const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Deterministic "random" so the granola in the window is the same on the
// server and in the browser, and in every render.
function seeded(seed: number) {
  let state = seed >>> 0 || 1;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}

// A slim leaf from the origin, pointing right; rotate it into a frond.
const leaf = (length: number, width: number) => `M0 0 C ${length * 0.3} ${-width * 0.9}, ${length * 0.7} ${-width}, ${length} ${-width * 0.35} C ${length * 0.7} ${-width * 0.1}, ${length * 0.3} ${width * 0.15}, 0 0Z`;
const frond = (x: number, y: number, angle: number, length: number, width: number, fill: string) =>
  `<path d="${leaf(length, width)}" transform="translate(${x} ${y}) rotate(${angle})" fill="${fill}"/>`;
// A palm crown: fronds fanning out of one point.
const crown = (x: number, y: number, angles: number[], length: number, fill: string) => angles.map((angle) => frond(x, y, angle, length, length * 0.22, fill)).join("");

// The granola behind the window: clusters, a few raisins and coconut flakes.
function granola(seed: number) {
  const random = seeded(seed);
  const between = (min: number, max: number) => min + random() * (max - min);
  const parts: string[] = [`<rect x="40" y="322" width="250" height="140" fill="${v("granola")}"/>`];
  const palette = ["cluster-1", "cluster-2", "cluster-3", "cluster-4", "cluster-1", "cluster-2", "cluster-3"];
  for (let i = 0; i < 260; i++) {
    const cx = between(44, 286).toFixed(1), cy = between(326, 458).toFixed(1);
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${between(3.5, 9).toFixed(1)}" ry="${between(2.5, 6).toFixed(1)}" transform="rotate(${Math.round(between(0, 180))} ${cx} ${cy})" fill="${v(palette[Math.floor(random() * palette.length)])}"/>`);
  }
  for (let i = 0; i < 40; i++) {
    const cx = between(44, 286).toFixed(1), cy = between(326, 458).toFixed(1);
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${between(2, 4).toFixed(1)}" ry="${between(1.5, 2.5).toFixed(1)}" transform="rotate(${Math.round(between(0, 180))} ${cx} ${cy})" fill="${v("cluster-4")}" opacity=".85"/>`);
  }
  for (let i = 0; i < 16; i++) {
    const cx = between(50, 280).toFixed(1), cy = between(330, 452).toFixed(1);
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="3.6" ry="2.6" transform="rotate(${Math.round(between(0, 180))} ${cx} ${cy})" fill="${v("raisin")}"/>`);
  }
  for (let i = 0; i < 7; i++) {
    const x = between(50, 270).toFixed(1), y = between(332, 448).toFixed(1);
    parts.push(`<rect x="${x}" y="${y}" width="16" height="5" rx="2.5" transform="rotate(${Math.round(between(-70, 70))} ${x} ${y})" fill="${v("coconut")}"/>`);
  }
  return parts.join("");
}

// The window: an organic opening across the wave band, with a soft inner edge.
const WINDOW = "M64 352 C 92 330, 200 322, 258 348 C 284 360, 278 424, 240 438 C 190 454, 118 452, 78 432 C 52 420, 48 372, 64 352 Z";

const waves = (tokens: string[], tops: number[]) => tokens.map((token, i) => {
  const y = tops[i];
  return `<path d="M30 ${y} C 80 ${y - 16}, 150 ${y + 16}, 220 ${y - 2} C 262 ${y - 12}, 292 ${y - 2}, 310 ${y + 4} V522 H30Z" fill="${v(token)}"/>`;
}).join("");

const scenes: Record<PouchDesign, { bg: string; accent: string; label: string; art: string; waves: string; footerInk: boolean }> = {
  "the-og": {
    bg: v("og-bg"), accent: v("og-accent"), label: "Cream, sun and Le Morne", footerInk: false,
    art: [
      `<circle cx="238" cy="142" r="56" fill="${v("og-sun")}"/>`,
      `<path d="M150 232 c5 -6 10 -6 15 0 M164 224 c5 -6 10 -6 15 0" fill="none" stroke="${v("og-palm")}" stroke-width="1.4" stroke-linecap="round"/>`,
      `<path d="M162 314 C 180 288, 200 266, 222 260 C 246 256, 272 272, 298 314 Z" fill="${v("og-mountain")}"/>`,
      `<path d="M222 260 C 246 256, 272 272, 298 314 L 242 314 Z" fill="${v("og-mountain-shade")}"/>`,
      `<path d="M30 312 C 100 304, 200 318, 310 308 V 350 H30Z" fill="${v("og-sand")}"/>`,
      `<path d="M304 350 C 302 316, 292 276, 274 246" fill="none" stroke="${v("og-palm")}" stroke-width="5.5" stroke-linecap="round"/>`,
      crown(274, 244, [-168, -138, -108, -76, -42, -8, 26], 72, v("og-palm")),
    ].join(""),
    waves: waves(["og-wave-1", "og-wave-2", "og-wave-3"], [340, 394, 452]),
  },
  "dawn-patrol": {
    bg: v("dawn-bg"), accent: v("dawn-accent"), label: "Blue hour, palms and a surfer on the beach", footerInk: false,
    art: [
      `<circle cx="258" cy="196" r="38" fill="${v("dawn-moon")}"/>`,
      crown(332, 78, [122, 140, 158, 176, 196], 104, v("dawn-palm")),
      crown(338, 128, [150, 170, 192, 214], 76, v("dawn-palm")),
      `<path d="M146 314 L 190 268 L 214 282 L 236 260 L 270 292 L 288 284 L 316 314 Z" fill="${v("dawn-mountain")}"/>`,
      `<path d="M236 260 L 270 292 L 288 284 L 316 314 L 236 314 Z" fill="${v("dawn-mountain-shade")}"/>`,
      `<path d="M30 312 C 120 304, 230 318, 310 310 V 352 H30Z" fill="${v("dawn-sand")}"/>`,
      `<g fill="${v("dawn-palm")}" transform="translate(262 296) scale(1.25)"><circle cx="0" cy="0" r="4"/><path d="M-3 4 h6 l1 16 h-8Z"/><path d="M-3 20 l-3 18 h3 l3 -13 l3 13 h3 l-3 -18Z"/><rect x="-14" y="10" width="30" height="6" rx="3" transform="rotate(-14 1 13)"/></g>`,
    ].join(""),
    waves: waves(["dawn-wave-1", "dawn-wave-2", "dawn-wave-3", "dawn-wave-4"], [344, 388, 436, 480]),
  },
  "power-up": {
    bg: v("power-bg"), accent: v("power-accent"), label: "Sage, tropical leaves and a hibiscus", footerInk: false,
    art: [
      `<circle cx="252" cy="222" r="52" fill="${v("power-halo")}"/>`,
      `<circle cx="252" cy="222" r="40" fill="${v("power-sun")}"/>`,
      frond(330, 92, 128, 118, 34, v("power-leaf-3")),
      frond(336, 128, 152, 118, 36, v("power-leaf-2")),
      frond(340, 178, 172, 100, 30, v("power-leaf-1")),
      frond(334, 232, 194, 96, 28, v("power-leaf-3")),
      `<path d="M330 92 L 238 172 M336 128 L 226 178 M340 178 L 242 184 M334 232 L 244 258" fill="none" stroke="${v("power-bg")}" stroke-width="1.2" opacity=".7"/>`,
      `<g transform="translate(246 304)">${[0, 72, 144, 216, 288].map((angle) => `<path d="M0 0 C 12 -6, 24 -26, 10 -40 C -4 -50, -20 -30, 0 0Z" transform="rotate(${angle})" fill="${v("power-flower")}"/>`).join("")}<path d="M0 0 L 10 -30" stroke="${v("power-stamen")}" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="-30" r="3.5" fill="${v("power-stamen")}"/><circle r="4" fill="${v("power-stamen")}"/></g>`,
      frond(270, 322, 212, 46, 12, v("power-leaf-2")),
      frond(218, 326, -28, 46, 12, v("power-leaf-2")),
    ].join(""),
    waves: waves(["power-wave-1", "power-wave-2", "power-wave-3"], [344, 396, 452]),
  },
  new: {
    bg: v("new-bg"), accent: v("new-accent"), label: "No design yet", footerInk: false,
    art: `<circle cx="238" cy="150" r="52" fill="none" stroke="${v("new-wave-2")}" stroke-width="2" stroke-dasharray="6 6"/>`,
    waves: waves(["new-wave-1", "new-wave-2", "new-wave-3"], [340, 394, 452]),
  },
};

export type PouchOptions = { name: string; grams: number; id?: string; className?: string; title?: string };

/** The pouch as inline SVG markup. `name` prints as the flavour; a "new" design prints "?". */
export function pouchSvg(design: PouchDesign, { name, grams, id = "pouch", className = "", title }: PouchOptions): string {
  const scene = scenes[design];
  const flavour = design === "new" ? "?" : name.trim().toUpperCase();
  const script = flavour.length > 14 ? 26 : flavour.length > 9 ? 31 : 38;
  const underline = Math.min(196, Math.max(56, flavour.length * (script * 0.55)));
  const ink = v("ink");
  const footer = scene.footerInk ? ink : v("cream");
  const mono = (x: number, y: number, text: string, opts = "") => `<text x="${x}" y="${y}" class="font-mono" font-size="8.5" font-weight="600" letter-spacing="1.6" fill="${ink}" ${opts}>${esc(text)}</text>`;
  return `<svg viewBox="${POUCH_VIEWBOX}" role="img" aria-label="${esc(title ?? `${design === "new" ? "Unnamed" : name} granola pouch, ${grams} g — ${scene.label}`)}" class="${esc(className)}" focusable="false">
<defs>
  <clipPath id="${id}-body"><rect x="30" y="22" width="280" height="500" rx="18"/></clipPath>
  <clipPath id="${id}-window"><path d="${WINDOW}"/></clipPath>
  <linearGradient id="${id}-sheen" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${v("cream")}" stop-opacity=".55"/><stop offset=".35" stop-color="${v("cream")}" stop-opacity="0"/><stop offset=".85" stop-color="${ink}" stop-opacity="0"/><stop offset="1" stop-color="${ink}" stop-opacity=".14"/></linearGradient>
</defs>
<ellipse cx="172" cy="532" rx="118" ry="9" fill="${ink}" opacity=".16"/>
<g clip-path="url(#${id}-body)">
  <rect x="30" y="22" width="280" height="500" fill="${scene.bg}"/>
  ${scene.art}
  ${scene.waves}
  <g clip-path="url(#${id}-window)">${granola(design.length * 7919 + grams)}</g>
  <path d="${WINDOW}" fill="none" stroke="${ink}" stroke-opacity=".22" stroke-width="5"/>
  <path d="${WINDOW}" fill="none" stroke="${v("cream")}" stroke-opacity=".7" stroke-width="1.5"/>
  <rect x="30" y="66" width="280" height="9" fill="${ink}" opacity=".12"/>
  <rect x="30" y="66" width="280" height="1.5" fill="${v("cream")}" opacity=".8"/>
  <path d="M30 506 Q170 520 310 506 V522 H30Z" fill="${ink}" opacity=".14"/>
  <rect x="30" y="22" width="280" height="500" fill="url(#${id}-sheen)"/>
  ${mono(48, 44, "REAL")}${mono(48, 55, "FOOD")}<rect x="48" y="59" width="14" height="1.3" fill="${ink}"/>
  ${mono(292, 44, "KIDS", 'text-anchor="end"')}${mono(292, 55, "APPROVED", 'text-anchor="end"')}<rect x="278" y="59" width="14" height="1.3" fill="${ink}"/>
  <text x="46" y="156" class="font-sans" font-size="47" font-weight="800" letter-spacing="-1.6" fill="${ink}">sunset</text>
  <text x="46" y="198" class="font-sans" font-size="47" font-weight="800" letter-spacing="-1.6" fill="${ink}">duckies<tspan font-size="12" font-weight="600" dy="-22" dx="1">™</tspan></text>
  <text x="48" y="220" class="font-sans" font-size="12" font-weight="500" letter-spacing="5" fill="${ink}">GRANOLA</text>
  <text x="48" y="262" class="font-accent italic" font-size="${script}" font-weight="700" letter-spacing="-.5" fill="${scene.accent}" transform="rotate(-2 48 262)">${esc(flavour)}</text>
  <path d="M49 270 C ${49 + underline * 0.4} 266, ${49 + underline * 0.7} 274, ${49 + underline} 268" fill="none" stroke="${scene.accent}" stroke-width="2" stroke-linecap="round"/>
  <text x="48" y="292" class="font-mono" font-size="7.5" font-weight="600" letter-spacing="1.4" fill="${ink}">HAND CRAFTED</text>
  <text x="48" y="304" class="font-mono" font-size="7.5" font-weight="600" letter-spacing="1.4" fill="${ink}">MADE IN MAURITIUS</text>
  <g class="font-mono" font-size="8.5" font-weight="600" letter-spacing="1.6" fill="${footer}">
    <text x="48" y="468">SALTY HAIR</text><text x="48" y="481">REAL GRIT</text><text x="48" y="494">NO CAP.</text>
    <text x="292" y="494" text-anchor="end">${grams} g</text>
  </g>
</g>
<rect x="30" y="22" width="280" height="500" rx="18" fill="none" stroke="${ink}" stroke-opacity=".3" stroke-width="1.2"/>
</svg>`;
}

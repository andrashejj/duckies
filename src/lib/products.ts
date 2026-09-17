import type { Product, Prisma } from "../generated/prisma/client";

import { prisma } from "./prisma";

export { formatPrice } from "./format";

export type Colorway = "cream" | "teal" | "sun" | "coral" | "lilac" | "ink";

export type ColorTheme = {
  /** Background + text utilities for the product visual */
  visual: string;
  /** Stroke utility for the decorative wave */
  wave: string;
  /** Badge fill + text utilities */
  badge: string;
};

// Utility classes rather than colour values, so the visuals follow the theme
// tokens and Tailwind can see every class at build time.
export const colorThemes: Record<Colorway, ColorTheme> = {
  cream: { visual: "bg-surface-2 text-fg", wave: "stroke-coral-500", badge: "bg-coral-500 text-cream-soft" },
  teal: { visual: "bg-teal-500 text-ink-950", wave: "stroke-ink-950", badge: "bg-sun-500 text-ink-950" },
  sun: { visual: "bg-sun-500 text-ink-950", wave: "stroke-ink-950", badge: "bg-coral-500 text-cream-soft" },
  coral: { visual: "bg-coral-500 text-cream-soft", wave: "stroke-sun-500", badge: "bg-sun-500 text-ink-950" },
  lilac: { visual: "bg-lilac-400 text-ink-950", wave: "stroke-ink-950", badge: "bg-ink-950 text-cream-soft" },
  ink: { visual: "bg-ink-950 text-cream-soft", wave: "stroke-sun-500", badge: "bg-sun-500 text-ink-950" },
};

export function themeFor(colorway: string): ColorTheme {
  return colorThemes[colorway as Colorway] ?? colorThemes.ink;
}

export function availableProductWhere(now = new Date()): Prisma.ProductWhereInput {
  return { active: true, OR: [
    { dropId: null },
    { drop: { is: { status: "LIVE", AND: [
      { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
      { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
    ] } } },
  ] };
}

export async function listActiveProducts(): Promise<Product[]> {
  return prisma.product.findMany({
    where: availableProductWhere(),
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({ where: { slug, ...availableProductWhere() }, include: { drop: true } });
}

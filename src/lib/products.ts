import type { Product } from "@prisma/client";

import { prisma } from "./prisma";

export type Colorway = "cream" | "teal" | "sun" | "coral" | "lilac" | "ink";

export type ColorTheme = {
  bg: string;
  ink: string;
  waveStroke: string;
  badgeBg: string;
  badgeInk: string;
};

export const colorThemes: Record<Colorway, ColorTheme> = {
  cream: {
    bg: "var(--color-cream-deep)",
    ink: "var(--color-ink-950)",
    waveStroke: "var(--color-coral-500)",
    badgeBg: "var(--color-coral-500)",
    badgeInk: "var(--color-cream-soft)",
  },
  teal: {
    bg: "var(--color-teal-500)",
    ink: "var(--color-ink-950)",
    waveStroke: "var(--color-ink-950)",
    badgeBg: "var(--color-sun-500)",
    badgeInk: "var(--color-ink-950)",
  },
  sun: {
    bg: "var(--color-sun-500)",
    ink: "var(--color-ink-950)",
    waveStroke: "var(--color-ink-950)",
    badgeBg: "var(--color-coral-500)",
    badgeInk: "var(--color-cream-soft)",
  },
  coral: {
    bg: "var(--color-coral-500)",
    ink: "var(--color-cream-soft)",
    waveStroke: "var(--color-sun-500)",
    badgeBg: "var(--color-sun-500)",
    badgeInk: "var(--color-ink-950)",
  },
  lilac: {
    bg: "var(--color-lilac-400)",
    ink: "var(--color-ink-950)",
    waveStroke: "var(--color-ink-950)",
    badgeBg: "var(--color-ink-950)",
    badgeInk: "var(--color-cream-soft)",
  },
  ink: {
    bg: "var(--color-ink-950)",
    ink: "var(--color-cream-soft)",
    waveStroke: "var(--color-sun-500)",
    badgeBg: "var(--color-sun-500)",
    badgeInk: "var(--color-ink-950)",
  },
};

export function themeFor(colorway: string): ColorTheme {
  return colorThemes[colorway as Colorway] ?? colorThemes.ink;
}

export function formatPrice(priceCents: number, currency = "MUR"): string {
  const whole = Math.round(priceCents / 100);
  const prefix = currency === "MUR" ? "Rs" : currency;
  return `${prefix} ${whole.toLocaleString("en-GB")}`;
}

export async function listActiveProducts(): Promise<Product[]> {
  return prisma.product.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
  });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return prisma.product.findUnique({ where: { slug } });
}

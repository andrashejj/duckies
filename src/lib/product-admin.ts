import { z } from "zod";

export const CATEGORY_VALUES = [
  "APPAREL",
  "HEADWEAR",
  "ACCESSORIES",
  "BOARD_CARE",
  "STATIONERY",
  "BUNDLE",
] as const;

export type ProductCategoryValue = (typeof CATEGORY_VALUES)[number];

export const COLORWAY_OPTIONS = [
  "cream",
  "teal",
  "sun",
  "coral",
  "lilac",
  "ink",
] as const;

export const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Slug must be url-safe (a-z, 0-9, dashes)"),
  name: z.string().trim().min(1, "Name is required").max(160),
  kind: z.string().trim().min(1, "Kind is required").max(80),
  tagline: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().min(1, "Description is required").max(4000),
  priceCents: z.number().int().min(0).max(10_000_00 * 100),
  currency: z.string().trim().min(1).max(8).default("MUR"),
  category: z.enum(CATEGORY_VALUES),
  sizes: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  colorway: z.enum(COLORWAY_OPTIONS).default("ink"),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  imageAlt: z.string().trim().max(300).optional().nullable(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  stock: z.number().int().min(0).max(10_000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export type ProductInput = z.infer<typeof productSchema>;

export const CATEGORY_LABEL: Record<ProductCategoryValue, string> = {
  APPAREL: "Apparel",
  HEADWEAR: "Headwear",
  ACCESSORIES: "Accessories",
  BOARD_CARE: "Board care",
  STATIONERY: "Stationery",
  BUNDLE: "Bundle",
};

import { z } from "zod";

export const DROP_STATUS_VALUES = ["DRAFT", "LIVE", "CLOSED"] as const;

export type DropStatusValue = (typeof DROP_STATUS_VALUES)[number];

const isoDate = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
  .transform((v) => new Date(v))
  .nullable()
  .optional();

export const dropSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Slug must be url-safe (a-z, 0-9, dashes)"),
  name: z.string().trim().min(1, "Name is required").max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(DROP_STATUS_VALUES).default("DRAFT"),
  opensAt: isoDate,
  closesAt: isoDate,
  pickupNote: z.string().trim().max(400).optional().nullable(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export type DropInput = z.infer<typeof dropSchema>;

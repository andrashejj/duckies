import { z } from "zod";
export type ParentProfile = { email: string; name: string; phone: string; photoVersion: string | null; children: { id: string; name: string; relationship?: string }[] };
export const parentProfileSchema = z.object({ name: z.string().trim().min(1).max(120), phone: z.string().trim().max(40) }).strict();

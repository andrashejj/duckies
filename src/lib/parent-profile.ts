import { z } from "zod";
// What the club has granted an adult: approved club membership (the organiser
// ticks it by hand), sign-in to their own family only, or nothing yet.
export type ParentAccess = "organiser" | "member" | "family" | "none";
export type ParentProfile = { email: string; name: string; phone: string; photoVersion: string | null; access: ParentAccess; signedIn: boolean; children: { id: string; name: string; relationship?: string }[] };
export const parentProfileSchema = z.object({ name: z.string().trim().min(1).max(120), phone: z.string().trim().max(40) }).strict();

import { z } from "zod";
import { MINIMUM_AGE, WAIVER_VERSION } from "./policy";
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) => !/[\p{Cc}\p{Cf}]/u.test(value),
      "Remove unsupported control characters.",
    );
const phone = text(40).refine(
  (value) => /^\+?[0-9 ()-]{6,40}$/.test(value) && value.replace(/\D/g, "").length >= 6,
  "Enter a reachable phone number, including country code.",
);
const guardian = z
  .object({
    name: text(120),
    relationship: text(60),
    phone,
    email: z
      .email()
      .max(200)
      .transform((value) => value.toLowerCase()),
  })
  .strict();
export const registrationSchema = z
  .object({
    version: z.literal(WAIVER_VERSION),
    childName: text(80),
    dateOfBirth: z.iso
      .date()
      .refine((value) => {
        const date = new Date(value + "T00:00:00Z");
        const earliest = new Date();
        earliest.setUTCFullYear(earliest.getUTCFullYear() - 25);
        return date <= new Date() && date >= earliest;
      }, "Enter a valid child's date of birth.")
      .refine(
        (value) => ageAt(value) >= MINIMUM_AGE,
        `Sunset Duckies is for kids aged ${MINIMUM_AGE} and up. Message the club if your child is younger.`,
      ),
    guardians: z.array(guardian).min(1).max(4),
    emergencyName: text(120),
    emergencyRelationship: text(60),
    emergencyPhone: phone,
    medicalNotes: z.string().trim().max(2000),
    // Training is all that membership covers; families pick the rhythm. A cup
    // entry has no training, so the server only insists on it for semesters.
    sessionsPerWeek: z.enum(["1", "2"]).optional(),
    media: z.enum(["yes", "no"]),
    parentInWater: z.literal(true),
    swimming: z.literal(true),
    reef: z.literal(true),
    gear: z.literal(true),
    waiverAccepted: z.literal(true),
    electronicConsent: z.literal(true),
    signerName: text(120),
    // Optional drawn signature in normalised coordinates. Typed signatures remain accessible.
    signature: z
      .array(
        z
          .array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]))
          .min(2)
          .max(600),
      )
      .max(30)
      .default([]),
    // Set when a guardian re-signs through the same link to correct details:
    // the id of the record they are replacing. Absent on a first signature.
    supersedes: z.uuid().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.signerName.toLowerCase() === value.guardians[0].name.toLowerCase(),
    {
      message: "The signer must be the first legal guardian listed.",
      path: ["signerName"],
    },
  );
export type RegistrationInput = z.infer<typeof registrationSchema>;
export function ageAt(dateOfBirth: string, today = new Date()) {
  const birth = new Date(dateOfBirth + "T00:00:00Z");
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() &&
      today.getUTCDate() < birth.getUTCDate())
  )
    age--;
  return age;
}
// The short public sign-up (join the club, or a cup-only entry): who is
// coming and how to reach the family. The full details come with the form.
export const signupSchema = z
  .object({
    kidName: text(80),
    contactName: text(120),
    contactPhone: phone,
  })
  .strict();
export type SignupInput = z.infer<typeof signupSchema>;
// The cup sign-up adds one choice: the Cup alone, or club membership with it.
export const cupSignupSchema = signupSchema.extend({ join: z.boolean().default(false) }).strict();
export const emailSchema = z
  .email()
  .max(200)
  .transform((value) => value.trim().toLowerCase());
export const paymentSchema = z
  .object({
    term: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,39}$/),
    status: z.enum(["paid", "unpaid"]),
    amountMur: z.number().min(0).max(1000000).multipleOf(0.01).nullable(),
    note: text(1000),
  })
  .strict();
export const PAYMENT_OWNER = "andras@hejj.xyz";
export function canManagePayments(email: string) {
  return email.trim().toLowerCase() === PAYMENT_OWNER;
}
export const uuid = z.uuid();

import { z } from "zod";
import { WAIVER_VERSION } from "./policy";
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
    dateOfBirth: z.iso.date().refine((value) => {
      const date = new Date(value + "T00:00:00Z");
      const earliest = new Date();
      earliest.setUTCFullYear(earliest.getUTCFullYear() - 25);
      return date <= new Date() && date >= earliest;
    }, "Enter a valid child's date of birth."),
    guardians: z.array(guardian).min(1).max(4),
    emergencyName: text(120),
    emergencyRelationship: text(60),
    emergencyPhone: phone,
    medicalNotes: z.string().trim().max(2000),
    division: z.enum(["duckling", "duck"]),
    rashieSize: text(40),
    rashieName: text(80),
    membership: z.enum(["child", "family"]),
    media: z.enum(["yes", "no"]),
    parentInWater: z.literal(true),
    swimming: z.literal(true),
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

import { z } from "zod";
import { WAIVER_VERSION } from "./policy";
export { ageAt } from "./age";
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
export const guardianSchema = z
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
// A family signs one waiver for all their children, so the form's fields come
// in two halves: what differs per child, and what the guardian fills in and
// signs once. A stored record is one of each — a child, with the signature
// that covers them — so a kid's file reads exactly as it always has.
const childFields = {
  childName: text(80),
  dateOfBirth: z.iso
    .date()
    .refine((value) => {
      const date = new Date(value + "T00:00:00Z");
      const earliest = new Date();
      earliest.setUTCFullYear(earliest.getUTCFullYear() - 25);
      return date <= new Date() && date >= earliest;
    }, "Enter a valid child's date of birth."),
  medicalNotes: z.string().trim().max(2000),
  // Training is all that membership covers; families pick the rhythm. A cup
  // entry has no training, so the server only insists on it for semesters.
  sessionsPerWeek: z.enum(["1", "2"]).optional(),
};
const signedOnceFields = {
  version: z.literal(WAIVER_VERSION),
  guardians: z.array(guardianSchema).min(1).max(4),
  emergencyName: text(120),
  emergencyRelationship: text(60),
  emergencyPhone: phone,
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
};
const signerIsFirstGuardian: [
  (value: { signerName: string; guardians: { name: string }[] }) => boolean,
  { message: string; path: PropertyKey[] },
] = [
  (value) => value.signerName.toLowerCase() === value.guardians[0].name.toLowerCase(),
  {
    message: "The signer must be the first legal guardian listed.",
    path: ["signerName"],
  },
];
// One stored record: the shape a signed waiver, its PDF and the roster read.
export const registrationSchema = z
  .object({
    ...signedOnceFields,
    ...childFields,
    // Set when a guardian re-signs through the same link to correct details:
    // the id of the record they are replacing. Absent on a first signature.
    supersedes: z.uuid().optional(),
  })
  .strict()
  .refine(...signerIsFirstGuardian);
export type RegistrationInput = z.infer<typeof registrationSchema>;
// The one choice on the public form: the club, the Cup alone, or both.
export const registrationPlan = z.enum(["club", "cup", "both"]);
export type RegistrationPlan = z.infer<typeof registrationPlan>;
// How many duckies one family can put on a single form.
export const MAX_CHILDREN = 6;
// What the form posts: every child, and the one signature that covers them.
export const submissionSchema = z
  .object({
    ...signedOnceFields,
    children: z
      .array(
        z
          .object({
            ...childFields,
            // The kid this block already signed for, on a correction. A child
            // being added for the first time has none.
            kidId: z.uuid().optional(),
            // Stable while the form is open, so a staged photo keeps finding
            // its child even as blocks are added and removed around it.
            slot: z.int().min(0).max(999),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_CHILDREN)
      .refine(
        (children) => new Set(children.map((child) => child.slot)).size === children.length,
        "Reload the form and fill in the children again.",
      )
      .refine(
        (children) =>
          new Set(children.map((child) => child.childName.trim().toLowerCase())).size ===
          children.length,
        "Two children on this form have the same name. Give each their full name.",
      ),
    // The signing this one corrects, identified by the group it produced.
    supersedes: z.uuid().optional(),
    // What a family signing the public form chose. An invitation already
    // carries its term, so only a draft needs it.
    plan: registrationPlan.optional(),
  })
  .strict()
  .refine(...signerIsFirstGuardian);
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type ChildInput = SubmissionInput["children"][number];
// What a guardian keeps current themselves: the name the club greets them by,
// and how it reaches them about one child. Signed details are never edited in
// place — those are corrected by signing the form again.
export const guardianNameSchema = z.object({ name: text(120) }).strict();
export const contactSchema = z
  .object({ contactName: text(120), contactPhone: phone })
  .strict();
export const emailSchema = z
  .email()
  .max(200)
  .transform((value) => value.trim().toLowerCase());
export const paymentSchema = z
  .object({
    term: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,39}$/),
    status: z.enum(["paid", "unpaid", "waived"]),
    amountMur: z.number().min(0).max(1000000).multipleOf(0.01).nullable(),
    note: text(1000),
  })
  .strict();
export const PAYMENT_OWNER = "andras@hejj.xyz";
export function canManagePayments(email: string) {
  return email.trim().toLowerCase() === PAYMENT_OWNER;
}
export const uuid = z.uuid();

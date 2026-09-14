import { z } from "zod";
import { getDatabase } from "../server/db";
import { RegistrationError } from "./records";
export const termId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,39}$/);
export const semesterSchema = z
  .object({
    id: termId,
    label: z.string().trim().min(1).max(100),
    startsOn: z.iso.date().nullable(),
    endsOn: z.iso.date().nullable(),
    childFeeMur: z.number().min(0).max(1000000).multipleOf(0.01),
    familyFeeMur: z.number().min(0).max(1000000).multipleOf(0.01),
  })
  .strict()
  .refine(
    (s) => !s.startsOn || !s.endsOn || s.endsOn >= s.startsOn,
    "End date must follow the start date.",
  );
export type Semester = {
  id: string;
  label: string;
  startsOn: string | null;
  endsOn: string | null;
  childFeeMur: number;
  familyFeeMur: number;
  isCurrent: boolean;
};
export async function semesters(): Promise<Semester[]> {
  const { rows } = await getDatabase().query(
    `SELECT id,label,starts_on::text AS "startsOn",ends_on::text AS "endsOn",child_fee_mur::float AS "childFeeMur",family_fee_mur::float AS "familyFeeMur",is_current AS "isCurrent" FROM club_semester ORDER BY starts_on DESC NULLS LAST,created_at DESC,id`,
  );
  return rows;
}
export async function getSemester(id?: string | null) {
  const all = await semesters();
  const term = id ? all.find((s) => s.id === id) : all.find((s) => s.isCurrent);
  if (!term)
    throw new RegistrationError(
      "Semester not found. Choose an existing semester.",
      400,
    );
  return term;
}

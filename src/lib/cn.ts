import { twMerge } from "tailwind-merge";

type ClassValue = string | false | null | undefined | 0 | ClassValue[];

// Joins conditional class values and lets a later utility override an earlier
// one (px-3 after px-7 wins), so components can accept a `class` prop safely.
export const cn = (...inputs: ClassValue[]): string => twMerge(inputs.flat(Infinity as 1).filter(Boolean).join(" "));

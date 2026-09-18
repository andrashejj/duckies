// The Cup edition families can register for. Its term id is the club_semester
// row the migration seeds; the label is what the roster and PDFs print.
export const CUP_TERM = "cup-vol-2";
export const CUP_LABEL = "Sunset Duckies Cup Vol. 02";
export const CUP_ENTRY_FEE_MUR = 1000;
export const isCupTerm = (term: string) => term.startsWith("cup-");

// How a kid is named in public: first name and the initial of the last,
// "Zoë T." — whether the club typed "Zoë T." or a family typed the full name.
export function publicName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// The Cup edition families can register for. Its term id is the club_semester
// row the migration seeds; the label is what the roster and PDFs print.
export const CUP_TERM = "cup-vol-2";
export const CUP_LABEL = "Sunset Duckies Cup Vol. 02";
export const CUP_ENTRY_FEE_MUR = 1000;
export const isCupTerm = (term: string) => term.startsWith("cup-");

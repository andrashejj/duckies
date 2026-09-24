import type { OrganiserKid } from "./records";
import { rosterCell, rosterCellLabel, rosterTone } from "../members-ui";
import { RECOMMENDED_AGE } from "./policy";

type Kid = { id: string; name: string };
export function rosterSearch(kid: Kid, organiser: boolean) {
  if (!organiser) return kid.name.toLocaleLowerCase();
  const record = kid as OrganiserKid;
  return [kid.name, record.contactName, record.contactPhone,
    ...(record.familyGuardians?.flatMap(g => [g.name, g.phone, g.email]) ?? []),
    record.registration?.emergencyPhone,
    record.cup?.contactName, record.cup?.contactPhone,
  ].filter(Boolean).join(" ").toLocaleLowerCase();
}
export function matchesRosterFilter(kid: OrganiserKid, filter: string) {
  switch (filter) {
    case "unpaid": return kid.payment?.status !== "paid" && kid.payment?.status !== "waived";
    case "unsigned": return !kid.waiverId;
    case "no-media": return kid.registration?.media !== "yes";
    case "water": return !kid.registration?.parentInWater;
    case "cup": return Boolean(kid.cup);
    case "younger": return kid.age !== null && kid.age < RECOMMENDED_AGE;
    default: return true;
  }
}
function cell(label: string, value: string, tone?: keyof typeof rosterTone) {
  const element = document.createElement("span");
  element.className = `${rosterCell} ${tone ? rosterTone[tone] : ""}`;
  const caption = document.createElement("span");
  caption.className = rosterCellLabel;
  caption.textContent = label;
  const text = document.createElement("span");
  text.textContent = value;
  element.append(caption, text);
  return element;
}
export function rosterCells(kid: OrganiserKid) {
  const r = kid.registration;
  const paid = kid.payment?.status === "paid";
  const waived = kid.payment?.status === "waived";
  return [
    cell("Age", kid.age === null ? "—" : String(kid.age), kid.age !== null && kid.age < RECOMMENDED_AGE ? "alert" : undefined),
    cell("Legal guardians", kid.familyGuardians?.map(g => g.name).join(", ") || "Not supplied"),
    cell("Waiver", kid.waiverId ? "Signed" : "Not signed", kid.waiverId ? "ok" : "pending"),
    cell("Media", r?.media === "yes" ? "Yes" : r?.media === "no" ? "No consent" : "Pending", r?.media === "no" ? "alert" : r?.media === "yes" ? "ok" : "pending"),
    cell("Parent in water", r?.parentInWater ? "Confirmed" : "Pending", r?.parentInWater ? "ok" : "pending"),
    cell("Payment", paid ? `Paid${kid.payment.amountMur == null ? "" : ` · Rs ${kid.payment.amountMur}`}` : waived ? "No payment" : kid.payment ? "Unpaid" : "Pending", paid || waived ? "ok" : "pending"),
  ];
}

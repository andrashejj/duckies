import type { OrganiserKid } from "./records";

type Kid = { id: string; name: string };
export function rosterSearch(kid: Kid, organiser: boolean) {
  if (!organiser) return kid.name.toLocaleLowerCase();
  const record = kid as OrganiserKid;
  return [kid.name, record.contactName, record.contactPhone,
    ...(record.registration?.guardians.flatMap(g => [g.name, g.phone, g.email]) ?? []),
    record.registration?.emergencyPhone,
  ].filter(Boolean).join(" ").toLocaleLowerCase();
}
export function matchesRosterFilter(kid: OrganiserKid, filter: string) {
  switch (filter) {
    case "unpaid": return kid.payment?.status !== "paid";
    case "unsigned": return !kid.waiverId;
    case "no-media": return kid.registration?.media !== "yes";
    case "water": return !kid.registration?.parentInWater;
    default: return true;
  }
}
function cell(label: string, value: string, tone = "") {
  const element = document.createElement("span");
  element.className = `roster-cell ${tone}`;
  const caption = document.createElement("span");
  caption.className = "roster-cell-label";
  caption.textContent = label;
  const text = document.createElement("span");
  text.textContent = value;
  element.append(caption, text);
  return element;
}
export function rosterCells(kid: OrganiserKid) {
  const r = kid.registration;
  const paid = kid.payment?.status === "paid";
  return [
    cell("Age", kid.age === null ? "—" : String(kid.age)),
    cell("Legal guardians", r?.guardians.map(g => g.name).join(", ") || "Not supplied"),
    cell("Waiver", kid.waiverId ? "Signed" : "Not signed", kid.waiverId ? "roster-ok" : "roster-pending"),
    cell("Media", r?.media === "yes" ? "Yes" : r?.media === "no" ? "No consent" : "Pending", r?.media === "no" ? "roster-alert" : r?.media === "yes" ? "roster-ok" : "roster-pending"),
    cell("Parent in water", r?.parentInWater ? "Confirmed" : "Pending", r?.parentInWater ? "roster-ok" : "roster-pending"),
    cell("Payment", paid ? `Paid${kid.payment.amountMur == null ? "" : ` · Rs ${kid.payment.amountMur}`}` : "Unpaid", paid ? "roster-ok" : "roster-pending"),
  ];
}

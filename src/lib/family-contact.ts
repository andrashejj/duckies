// A family with two duckies fills two forms — the club waiver is signed per
// surfer. This carries the parent's name and number from one form to the next
// so the second child is a name away instead of a form again.
//
// Session storage only: same tab, same browser, gone when it closes. It never
// leaves the device on its own, and holds nothing about the child.
export type FamilyContact = { contactName: string; contactPhone: string };

const KEY = "duckies:family-contact";

export function rememberFamily(contact: FamilyContact) {
  if (!contact.contactName.trim() || !contact.contactPhone.trim()) return;
  // Private browsing and blocked storage both throw; forgetting is harmless.
  try {
    sessionStorage.setItem(KEY, JSON.stringify(contact));
  } catch {}
}

export function recallFamily(): FamilyContact | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return typeof stored?.contactName === "string" && typeof stored?.contactPhone === "string"
      ? { contactName: stored.contactName, contactPhone: stored.contactPhone }
      : null;
  } catch {
    return null;
  }
}

// Prefills a sign-up form's parent fields from the remembered family, and says
// whether anything was filled in — the caller decides what to tell the family.
export function prefillFamily(form: HTMLFormElement) {
  const contact = recallFamily();
  if (!contact) return null;
  const name = form.elements.namedItem("contactName") as HTMLInputElement | null;
  const phone = form.elements.namedItem("contactPhone") as HTMLInputElement | null;
  if (!name || !phone) return null;
  name.value = contact.contactName;
  phone.value = contact.contactPhone;
  return contact;
}

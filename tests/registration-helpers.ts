// The form posts one signature and the children it covers. Tests still
// describe a registration the way a record reads — one flat object — so this
// splits it into children and signed-once fields the way the form does.
const childKeys = ["childName", "dateOfBirth", "medicalNotes", "sessionsPerWeek", "kidId"];

export function submission(...flat: Record<string, any>[]) {
  const shared: Record<string, any> = {};
  const children = flat.map((child, slot) => {
    const block: Record<string, any> = { slot };
    for (const [key, value] of Object.entries(child))
      // An unknown key stays at the top level, where .strict() still refuses it.
      (childKeys.includes(key) ? block : shared)[key] = value;
    return block;
  });
  return { ...shared, children };
}

import { getDatabase } from "./db";
import type { ParentProfile } from "../parent-profile";

/** Current guardian relationships, with editable adult profiles layered on top. */
export async function readParentProfiles(email?: string): Promise<ParentProfile[]> {
  const db = getDatabase();
  const guardians = await db.query<{ email: string; name: string; phone: string; kid_id: string; kid_name: string; relationship: string }>(`
    SELECT g.email,g.name,g.phone,g.relationship,g.kid_id,k.name AS kid_name
    FROM club_current_guardian g JOIN club_kid k ON k.id=g.kid_id
    WHERE ($1::text IS NULL OR g.email=$1)
    ORDER BY k.id`, [email ?? null]);
  const accounts = await db.query<{ email: string; name: string | null; phone: string | null; photo_updated_at: Date | null; saved_name: string | null }>(`
    WITH emails AS (
      SELECT email FROM club_member UNION SELECT email FROM cup_judge UNION SELECT email FROM club_parent_profile
    ) SELECT e.email, COALESCE(p.name, NULLIF(u.name,''), (SELECT name FROM cup_judge WHERE email=e.email ORDER BY created_at DESC LIMIT 1)) AS name, p.phone, p.photo_updated_at, p.name AS saved_name
    FROM emails e LEFT JOIN club_parent_profile p ON p.email=e.email LEFT JOIN "user" u ON lower(u.email)=e.email
    WHERE ($1::text IS NULL OR e.email=$1)`, [email ?? null]);
  const people = new Map<string, ParentProfile>();
  for (const guardian of guardians.rows) {
    let parent = people.get(guardian.email);
    if (!parent) { parent = { email: guardian.email, name: guardian.name ?? "", phone: guardian.phone ?? "", photoVersion: null, children: [] }; people.set(parent.email, parent); }
    if (!parent.children.some((kid) => kid.id === guardian.kid_id)) parent.children.push({ id: guardian.kid_id, name: guardian.kid_name, relationship: guardian.relationship });
  }
  for (const account of accounts.rows) {
    const parent = people.get(account.email) ?? { email: account.email, name: "", phone: "", photoVersion: null, children: [] };
    // Prefer a saved profile; a login's default name must not replace a guardian's name.
    parent.name = account.saved_name ?? (parent.name || account.name || "");
    parent.phone = account.phone ?? parent.phone;
    parent.photoVersion = account.photo_updated_at?.toISOString() ?? null;
    people.set(parent.email, parent);
  }
  return [...people.values()].sort((a,b) => (a.name || a.email).localeCompare(b.name || b.email));
}
export async function readOwnProfile(email: string, fallbackName = ""): Promise<ParentProfile> {
  return (await readParentProfiles(email))[0] ?? { email, name: fallbackName, phone: "", photoVersion: null, children: [] };
}
export async function saveParentProfile(email: string, profile: { name: string; phone: string }) {
  await getDatabase().query(`WITH saved AS (
    INSERT INTO club_parent_profile(email,name,phone) VALUES($1,$2,$3)
    ON CONFLICT(email) DO UPDATE SET name=$2,phone=$3,registration_link_id=NULL,updated_at=now() RETURNING email
  ) UPDATE "user" SET name=$2,"updatedAt"=now() WHERE lower(email) IN (SELECT email FROM saved)`, [email, profile.name, profile.phone]);
}

import { getDatabase } from "./db";

// Directly shared kids only: a co-parent's other family is never traversed.
export async function familyAccess(email: string) {
  const { rows } = await getDatabase().query(`SELECT
    EXISTS(SELECT 1 FROM club_current_guardian WHERE email=$1) AS family,
    EXISTS(SELECT 1 FROM club_current_guardian mine
      JOIN club_current_guardian other ON other.kid_id=mine.kid_id
      JOIN club_member m ON m.email=other.email WHERE mine.email=$1) AS family_member`, [email.toLowerCase()]);
  return { family: rows[0].family as boolean, familyMember: rows[0].family_member as boolean };
}

export async function familyEmails(email: string): Promise<string[]> {
  const { rows } = await getDatabase().query(`SELECT DISTINCT other.email
    FROM club_current_guardian mine JOIN club_current_guardian other ON other.kid_id=mine.kid_id
    WHERE mine.email=$1`, [email.toLowerCase()]);
  return [...new Set([email.toLowerCase(), ...rows.map(row => row.email as string)])];
}

export async function familyOrderWhere(user: { id: string; email: string }) {
  const { rows } = await getDatabase().query(`SELECT DISTINCT f.order_id
    FROM club_order_family f JOIN club_current_guardian g ON g.kid_id=f.kid_id WHERE g.email=$1`, [user.email.toLowerCase()]);
  return { OR: [{ userId: user.id }, { email: user.email.toLowerCase() }, { id: { in: rows.map(row => row.order_id as string) } }] };
}

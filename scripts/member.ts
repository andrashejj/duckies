import { getDatabase } from "../src/lib/server/db";

const [action, rawEmail, role = "member"] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();
if (!["add", "remove"].includes(action) || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["member", "organiser"].includes(role)) {
  console.error("Usage: pnpm member add <email> [member|organiser] OR pnpm member remove <email>");
  process.exit(1);
}
const db = getDatabase();
try {
  if (action === "add") {
    await db.query("INSERT INTO club_member (email, role) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET role = $2", [email, role]);
    console.log(`Approved ${email} as ${role}. They can sign in with an email code.`);
  } else {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM club_member WHERE email = $1", [email]);
      await client.query('DELETE FROM "session" WHERE "userId" IN (SELECT id FROM "user" WHERE email = $1)', [email]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
    console.log(`Removed access for ${email} and revoked their sessions.`);
  }
} finally { await db.end(); }

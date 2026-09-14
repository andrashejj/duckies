import { config } from "dotenv";
import pg from "pg";
import { BRANDING_OWNER } from "../branding";

config({ quiet: true });

let pool: pg.Pool | undefined;

export function getDatabase() {
  const connectionString = process.env.DUCKIES_DATABASE_URL;
  if (!connectionString) throw new Error("DUCKIES_DATABASE_URL is required.");
  if (!pool) {
    pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 20000 });
    pool.on("error", () => console.error("Duckies database connection was interrupted."));
  }
  return pool;
}

export type Member = { email: string; role: "member" | "organiser" };

export async function findMember(email: string): Promise<Member | null> {
  const result = await getDatabase().query<Member>(
    "SELECT email, role FROM club_member WHERE email = $1", [email.trim().toLowerCase()],
  );
  return result.rows[0] ?? null;
}

export async function canSignIn(email: string) {
  email=email.trim().toLowerCase();
  if(email===BRANDING_OWNER)return true;
  if (await findMember(email)) return true;
  const result = await getDatabase().query('SELECT 1 FROM "Order" WHERE email = $1 LIMIT 1', [email.trim().toLowerCase()]);
  if(result.rowCount!==0)return true;
  return (await getDatabase().query("SELECT 1 FROM branding_access WHERE email=$1",[email])).rowCount!==0;
}

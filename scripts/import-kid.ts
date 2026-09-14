// Local administrative import. Never exposed as an HTTP endpoint.
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDatabase } from "../src/lib/server/db";
import { paymentSchema, PAYMENT_OWNER } from "../src/lib/registration/schema";
import { getSemester } from "../src/lib/registration/semesters";
const file = process.argv[2];
if (!file)
  throw new Error(
    "Usage: pnpm exec tsx scripts/import-kid.ts <private-json-file>",
  );
const data = z
  .object({
    name: z.string().trim().min(1).max(80),
    contactName: z.string().max(120),
    contactPhone: z.string().max(40),
    payment: paymentSchema,
  })
  .strict()
  .parse(JSON.parse(await readFile(file, "utf8")));
const pool = getDatabase();
const db = await pool.connect();
try {
  await getSemester(data.payment.term);
  await db.query("BEGIN");
  await db.query("SELECT pg_advisory_xact_lock(94831722)");
  await db.query(
    "INSERT INTO club_member (email,role) VALUES ($1,'organiser') ON CONFLICT(email) DO UPDATE SET role='organiser'",
    [PAYMENT_OWNER],
  );
  await db.query(
    'INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ($1,\'Andras\',$2,false,now(),now()) ON CONFLICT(email) DO NOTHING',
    [randomUUID(), PAYMENT_OWNER],
  );
  const user = (
    await db.query('SELECT id FROM "user" WHERE email=$1', [PAYMENT_OWNER])
  ).rows[0];
  let kid = (
    await db.query(
      "SELECT id FROM club_kid WHERE lower(name)=lower($1) AND archived_at IS NULL",
      [data.name],
    )
  ).rows;
  if (kid.length > 1)
    throw new Error(
      "Multiple matching children; resolve the match before importing.",
    );
  if (!kid.length)
    kid = (
      await db.query(
        "INSERT INTO club_kid(name,created_by,contact_name,contact_phone) VALUES ($1,$2,$3,$4) RETURNING id",
        [data.name, user.id, data.contactName, data.contactPhone],
      )
    ).rows;
  const prior = await db.query(
    "SELECT id FROM club_payment_event WHERE kid_id=$1 AND term=$2 AND note=$3 AND status=$4 AND amount_mur IS NOT DISTINCT FROM $5::numeric",
    [
      kid[0].id,
      data.payment.term,
      data.payment.note,
      data.payment.status,
      data.payment.amountMur,
    ],
  );
  if (!prior.rowCount)
    await db.query(
      "INSERT INTO club_payment_event(kid_id,term,status,amount_mur,note,actor_email) VALUES ($1,$2,$3,$4,$5,$6)",
      [
        kid[0].id,
        data.payment.term,
        data.payment.status,
        data.payment.amountMur,
        data.payment.note,
        PAYMENT_OWNER,
      ],
    );
  await db.query("COMMIT");
  console.log(
    `Recorded ${data.name} in the configured database. Kid ID: ${kid[0].id}. No guardian status or waiver signature was inferred.`,
  );
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally {
  db.release();
  await pool.end();
}

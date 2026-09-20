import { readFile } from "node:fs/promises";
import { correctBirthDate } from "../src/lib/registration/birth-date-corrections";
import { getDatabase } from "../src/lib/server/db";
const [file, mode] = process.argv.slice(2);
if (!file || (mode && mode !== "--apply")) throw new Error("Usage: tsx scripts/correct-birth-date.ts <private-json-file> [--apply]");
try {
  console.log(JSON.stringify({ ...await correctBirthDate(JSON.parse(await readFile(file,"utf8")), mode === "--apply"), dryRun: mode !== "--apply" }));
} finally { await getDatabase().end(); }

import { test, expect } from "@playwright/test";
import pg from "pg";
import { signIn } from "./auth-helpers";
import { readFile } from "node:fs/promises";

const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = "http://127.0.0.1:4329";
const cron = "/api/cron/plan-notifications";
const cronHeaders = { authorization: "Bearer duckies-test-cron-only" };
const recipients = ["onody.dora@gmail.com", "tamas.kovacs@sunrise.ch", "niki.este.2022@ksz.edu-zg.ch", "andras@hejj.xyz"];

test.beforeEach(async ({ request }) => {
  await db.query('TRUNCATE plan_task_event,plan_task,plan_milestone,plan_person,branding_access_event,branding_access,"user","session",account,verification,"rateLimit" CASCADE');
  await db.query("DELETE FROM shop_request_limit WHERE key LIKE 'plan-message:%'");
  await db.query("INSERT INTO branding_access(email,name,status,can_edit,verified_at) VALUES('editor@example.com','Task Editor','approved',true,now())");
  await signIn(request, "editor@example.com");
  await request.get("/api/plan");
});
test.afterAll(async () => { await db.end(); });

test("task creation, real edits and comments notify all four; invalid, stale and unchanged saves do not", async ({ request }) => {
  expect((await db.query("SELECT * FROM plan_task_notification")).rowCount).toBe(0);
  const created = await request.post("/api/plan", { headers: { origin }, data: { milestoneId: "event", text: "Print and laminate the exercise cards.", ownerId: "estelle", dueOn: "2026-10-05" } });
  expect(created.status()).toBe(201);
  const task = (await created.json()).task;
  let rows = (await db.query("SELECT * FROM plan_task_notification")).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ attempts: 1, provider_id: "test-email", last_error: null });
  expect(rows[0].sent_at).toBeTruthy();
  expect(rows[0].payload.to).toEqual(recipients);
  expect(rows[0].payload.text).toContain("Owner: Estelle");
  expect(rows[0].payload.text).toContain("Due: Mon 5 Oct 2026");
  expect(rows[0].payload.text).toContain(`/branding-plan/tasks/${task.id}`);
  expect(rows[0].payload.text).toContain("Task Editor created a task.");
  const endpoint = `/api/plan/tasks/${task.id}`;
  expect((await request.patch(endpoint, { headers: { origin }, data: { version: 1, status: "doing", ownerId: "dori", text: "Print, laminate and bring the cards." } })).status()).toBe(200);
  rows = (await db.query("SELECT * FROM plan_task_notification ORDER BY created_at")).rows;
  expect(rows).toHaveLength(2);
  expect(rows[1].payload.text).toContain("Status changed: todo → doing.");
  expect(rows[1].payload.text).toContain("Owner changed from Estelle.");
  expect(rows[1].payload.text).toContain("Previous description: Print and laminate the exercise cards.");
  expect((await request.patch(endpoint, { headers: { origin }, data: { version: 1, status: "done" } })).status()).toBe(409);
  expect((await request.patch(endpoint, { headers: { origin: "https://elsewhere.example" }, data: { version: 2, status: "done" } })).status()).toBe(403);
  expect((await request.patch(endpoint, { headers: { origin }, data: { version: 2, ownerId: "missing" } })).status()).toBe(400);
  expect((await request.patch(endpoint, { headers: { origin }, data: { version: 2, status: "doing", ownerId: "dori" } })).status()).toBe(200);
  expect((await db.query("SELECT * FROM plan_task_notification")).rowCount).toBe(2);
  expect((await request.post(`${endpoint}/discussion`, { headers: { origin }, multipart: { body: "Printed. Ready for laminating.", files: { name: "receipt.txt", mimeType: "text/plain", buffer: Buffer.from("private receipt bytes") } } })).status()).toBe(201);
  rows = (await db.query("SELECT * FROM plan_task_notification ORDER BY created_at")).rows;
  expect(rows).toHaveLength(3);
  expect(rows[2].payload.to).toEqual(recipients);
  expect(rows[2].payload.text).toContain("Attachments: receipt.txt");
  expect(rows[2].payload.text).not.toContain("private receipt bytes");
  const mails = (await readFile(process.env.DUCKIES_TEST_MAIL_FILE!, "utf8")).trim().split("\n").map(line => JSON.parse(line));
  expect(mails.filter(mail => mail.text.includes(`/branding-plan/tasks/${task.id}`))).toHaveLength(3);
});

test("provider failure preserves the saved task and retries once through the protected cron", async ({ request }) => {
  expect((await request.get(cron)).status()).toBe(401);
  expect((await request.get(cron, { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  const response = await request.post("/api/plan", { headers: { origin }, data: { milestoneId: "event", text: "TASK_MAIL_FAIL_ONCE Print these cards.", ownerId: "estelle", dueOn: "2026-10-05" } });
  expect(response.status()).toBe(201);
  const task = (await response.json()).task;
  let row = (await db.query("SELECT * FROM plan_task_notification WHERE task_id=$1", [task.id])).rows[0];
  expect(row).toMatchObject({ attempts: 1, sent_at: null, provider_id: null });
  expect(row.last_error).toContain("queued for retry");
  expect((await db.query("SELECT id FROM plan_task WHERE id=$1", [task.id])).rowCount).toBe(1);
  await db.query("UPDATE plan_task_notification SET next_attempt_at=now() WHERE id=$1", [row.id]);
  const responses = await Promise.all([request.get(cron, { headers: cronHeaders }), request.get(cron, { headers: cronHeaders })]);
  const stats = await Promise.all(responses.map(r => r.json()));
  expect(stats.reduce((sum, v) => sum + v.sent, 0)).toBe(1);
  row = (await db.query("SELECT * FROM plan_task_notification WHERE task_id=$1", [task.id])).rows[0];
  expect(row).toMatchObject({ attempts: 2, provider_id: "test-email", last_error: null });
  expect(row.sent_at).toBeTruthy();
  expect((await (await request.get(cron, { headers: cronHeaders })).json()).sent).toBe(0);
  const mails = (await readFile(process.env.DUCKIES_TEST_MAIL_FILE!, "utf8")).trim().split("\n").map(line => JSON.parse(line));
  expect(mails.filter(mail => mail.text.includes(`/branding-plan/tasks/${task.id}`))).toHaveLength(1);
});

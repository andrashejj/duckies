import { randomUUID } from "node:crypto";
import type pg from "pg";
import { getDatabase } from "./db";
import { sendMail } from "./email";
import { getSiteUrl } from "../email/client";
import { formatDay, statusLabels, type TaskStatus } from "../plan";

// The task team requested by Andras. Server-only: not part of public page data.
export const taskNotificationRecipients = [
  "onody.dora@gmail.com",
  "tamas.kovacs@sunrise.ch",
  "niki.este.2022@ksz.edu-zg.ch",
  "andras@hejj.xyz",
];

type Mail = { to: string[]; subject: string; text: string };
type NotificationRow = { id: string; payload: Mail; attempts: number };

/** Must run inside the task transaction: a failed save never queues an email. */
export async function queueTaskNotification(db: pg.PoolClient, taskId: string, actor: string, action: "created" | "changed" | "commented", detail: string) {
  // Explicitly enabled in production; local/preview edits must not mail the team.
  if (process.env.PLAN_TASK_EMAILS_ENABLED !== "true") return null;
  const result = await db.query<{ text: string; status: TaskStatus; due_on: string | null; owner: string; milestone: string; author: string }>(`
    SELECT t.text,t.status,t.due_on::text,COALESCE(p.name,'Unassigned') AS owner,m.title AS milestone,
      COALESCE((SELECT name FROM plan_person WHERE email=$2),(SELECT name FROM branding_access WHERE email=$2),$2) AS author
    FROM plan_task t JOIN plan_milestone m ON m.id=t.milestone_id LEFT JOIN plan_person p ON p.id=t.owner_id WHERE t.id=$1`, [taskId, actor]);
  const task = result.rows[0];
  if (!task) throw new Error("Cannot notify about a missing task.");
  const label = action === "created" ? "New task" : action === "commented" ? "New task comment" : "Task changed";
  const verb = action === "created" ? "created a task" : action === "commented" ? "commented on a task" : "changed a task";
  const payload: Mail = {
    to: taskNotificationRecipients,
    subject: `${label}: ${task.text.replace(/\s+/g, " ").slice(0, 90)} — Sunset Duckies`,
    text: `${task.author} ${verb}.\n\n${task.text}\n\nOwner: ${task.owner}\nDue: ${task.due_on ? formatDay(task.due_on) + " " + task.due_on.slice(0, 4) : "Not set"}\nStatus: ${statusLabels[task.status]}\nGroup: ${task.milestone}${detail ? `\n\n${detail}` : ""}\n\nOpen task: ${getSiteUrl()}/branding-plan/tasks/${taskId}\n\nSunset Duckies`,
  };
  const id = randomUUID();
  await db.query("INSERT INTO plan_task_notification(id,task_id,payload) VALUES($1,$2,$3)", [id, taskId, JSON.stringify(payload)]);
  return id;
}

/** Immediate delivery plus a cron retry. Locks prevent concurrent sends; Resend keys
 * cover a crash after provider acceptance. Stop before its 24-hour deduplication expires. */
export async function deliverTaskNotifications(id?: string, limit = 5) {
  if (process.env.PLAN_TASK_EMAILS_ENABLED !== "true") return { sent: 0, failed: 0 };
  const counts = { sent: 0, failed: 0 };
  for (let i = 0; i < (id ? 1 : limit); i++) {
    const db = await getDatabase().connect();
    try {
      await db.query("BEGIN");
      const result = await db.query<NotificationRow>(`SELECT id,payload,attempts FROM plan_task_notification
        WHERE sent_at IS NULL AND next_attempt_at<=now() AND ($1::text IS NULL OR id=$1)
        AND (first_attempt_at IS NULL OR first_attempt_at>now()-interval '23 hours')
        ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`, [id ?? null]);
      const row = result.rows[0];
      if (!row) { await db.query("COMMIT"); break; }
      // Persist the start separately before delivery would lose our lock. On a process
      // crash the transaction rolls back, so the immutable created_at also bounds retries.
      if ((await db.query("SELECT 1 FROM plan_task_notification WHERE id=$1 AND created_at<=now()-interval '23 hours'", [row.id])).rowCount) {
        await db.query("UPDATE plan_task_notification SET last_error='Retry window expired; review provider delivery before resending.',next_attempt_at='infinity' WHERE id=$1", [row.id]);
        await db.query("COMMIT");
        counts.failed++;
        continue;
      }
      try {
        const providerId = await sendMail(row.payload, { idempotencyKey: `plan-task/${row.id}` });
        await db.query("UPDATE plan_task_notification SET attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,now()),sent_at=now(),provider_id=$2,last_error=NULL WHERE id=$1", [row.id, providerId]);
        counts.sent++;
      } catch {
        await db.query("UPDATE plan_task_notification SET attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,now()),next_attempt_at=now()+interval '5 minutes',last_error='Email delivery unavailable; queued for retry.' WHERE id=$1", [row.id]);
        counts.failed++;
      }
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally { db.release(); }
  }
  return counts;
}

/** Delivery trouble must never turn a committed task save into a retryable error. */
export async function sendQueuedTaskNotification(id: string | null) {
  if (!id) return;
  try { await deliverTaskNotifications(id); }
  catch { console.error("Task notification remains queued for retry."); }
}

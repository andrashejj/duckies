import { randomUUID } from "node:crypto";
import type pg from "pg";
import { MAX_TASK_FILES, MAX_TASK_FILE_BYTES, taskMessageSchema, type TaskDiscussion, type TaskMessage, type TaskHistoryEvent } from "../plan-discussion";
import { BRANDING_OWNER } from "../branding";
import { getDatabase } from "./db";
import { PlanError, taskFromRow, taskActivityColumns, type TaskRow } from "./plan";
import { queueTaskNotification, sendQueuedTaskNotification } from "./plan-notifications";

// File bytes are excluded from discussion responses. Downloads recheck access.
const nameForActor = "COALESCE(p.name, a.name, u.name, 'Club editor')";
const actorJoins = (column: string) => `LEFT JOIN plan_person p ON p.email=${column}
  LEFT JOIN branding_access a ON a.email=${column} LEFT JOIN "user" u ON u.email=${column}`;

export async function readTaskDiscussion(id: string): Promise<Omit<TaskDiscussion, "canEdit">> {
  const db = getDatabase();
  const task = await db.query<TaskRow & { owner_name: string; milestone_title: string }>(`SELECT t.id,t.milestone_id,t.text,t.owner_id,t.due_on::text,t.status,t.sort,t.version,t.updated_at,${taskActivityColumns},
    COALESCE(p.name,'Unassigned') AS owner_name,m.title AS milestone_title
    FROM plan_task t JOIN plan_milestone m ON m.id=t.milestone_id LEFT JOIN plan_person p ON p.id=t.owner_id WHERE t.id=$1`, [id]);
  if (!task.rowCount) throw new PlanError("Task not found.", 404);
  const messages = await db.query<TaskMessage>(`SELECT m.id,m.kind,m.body,${nameForActor} AS "authorName",m.created_at AS "createdAt",
    COALESCE((SELECT json_agg(json_build_object('id',f.id,'filename',f.filename,'size',octet_length(f.bytes)) ORDER BY f.id)
      FROM plan_task_attachment f WHERE f.message_id=m.id),'[]') AS attachments
    FROM plan_task_message m ${actorJoins("m.author")} WHERE m.task_id=$1 ORDER BY m.created_at,m.id`, [id]);
  const events = await db.query<TaskHistoryEvent>(`SELECT e.id::text,e.status,COALESCE(o.name,'Unassigned') AS "ownerName",${nameForActor} AS "authorName",e.created_at AS "createdAt"
    FROM plan_task_event e ${actorJoins("e.actor")} LEFT JOIN plan_person o ON o.id=e.owner_id WHERE e.task_id=$1 ORDER BY e.created_at,e.id`, [id]);
  return { task: taskFromRow(task.rows[0]), ownerName: task.rows[0].owner_name, milestoneTitle: task.rows[0].milestone_title, messages: messages.rows, events: events.rows };
}

export async function readTaskMessage(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) throw new PlanError("Use the comment form to send your message.", 415);
  // Stay below the function request limit, even with multipart overhead.
  const limit = MAX_TASK_FILE_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length")) > limit) throw new PlanError("Attachments must total 3 MB or less.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new PlanError("Add a message or a file.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new PlanError("Attachments must total 3 MB or less.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let form: FormData;
  try { form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": contentType } }).formData(); }
  catch { throw new PlanError("The upload could not be read. Choose your files again."); }
  const parsed = taskMessageSchema.safeParse({ kind: form.get("kind") ?? "comment", body: form.get("body") ?? "" });
  if (!parsed.success) throw new PlanError(parsed.error.issues[0]?.message ?? "Invalid message.");
  const uploads = form.getAll("files");
  if (uploads.length > MAX_TASK_FILES) throw new PlanError("Attach up to three files per message.");
  const files: { filename: string; bytes: Buffer }[] = [];
  let total = 0;
  for (const upload of uploads) {
    if (typeof upload === "string") throw new PlanError("Choose a file to attach.");
    if (!upload.name && !upload.size) continue;
    if (!upload.size) throw new PlanError("Empty files cannot be attached.");
    total += upload.size;
    if (total > MAX_TASK_FILE_BYTES) throw new PlanError("Attachments must total 3 MB or less.", 413);
    const filename = upload.name.split(/[\\/]/).at(-1)!.replace(/[\p{Cc}\p{Cf}]/gu, "").trim().slice(0, 180);
    if (!filename || filename === "." || filename === "..") throw new PlanError("Give the file a name before attaching it.");
    files.push({ filename, bytes: Buffer.from(await upload.arrayBuffer()) });
  }
  if (!parsed.data.body && !files.length) throw new PlanError("Add a message or a file.");
  return { ...parsed.data, files };
}

// Revocation while a file is uploading must prevent saving it afterwards.
async function lockEditor(db: pg.PoolClient, actor: string) {
  if (actor === BRANDING_OWNER) return;
  const access = await db.query("SELECT status,can_edit,verified_at FROM branding_access WHERE email=$1 FOR SHARE", [actor]);
  const row = access.rows[0];
  if (!row || row.status !== "approved" || !row.can_edit || !row.verified_at) throw new PlanError("Changing tasks needs edit access from Andras.", 403);
}

export async function addTaskMessage(taskId: string, input: Awaited<ReturnType<typeof readTaskMessage>>, actor: string) {
  const db = await getDatabase().connect();
  let notification: string | null = null;
  let messageId!: string;
  try {
    await db.query("BEGIN");
    await lockEditor(db, actor);
    if (!(await db.query("SELECT id FROM plan_task WHERE id=$1 FOR KEY SHARE", [taskId])).rowCount) throw new PlanError("Task not found.", 404);
    const rate = await db.query(`INSERT INTO shop_request_limit(key,count,reset_at) VALUES($1,1,now()+interval '10 minutes')
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN shop_request_limit.reset_at<=now() THEN 1 ELSE shop_request_limit.count+1 END,
      reset_at=CASE WHEN shop_request_limit.reset_at<=now() THEN now()+interval '10 minutes' ELSE shop_request_limit.reset_at END RETURNING count`, [`plan-message:${actor}`]);
    if (rate.rows[0].count > 30) throw new PlanError("Please wait a few minutes before adding another message.", 429);
    const id = randomUUID();
    await db.query("INSERT INTO plan_task_message(id,task_id,author,kind,body) VALUES($1,$2,$3,$4,$5)", [id, taskId, actor, input.kind, input.body]);
    for (const file of input.files) await db.query("INSERT INTO plan_task_attachment(id,message_id,filename,bytes) VALUES($1,$2,$3,$4)", [randomUUID(), id, file.filename, file.bytes]);
    notification = await queueTaskNotification(db, taskId, actor, "commented", [input.body, input.files.length ? `Attachments: ${input.files.map(file => file.filename).join(", ")} (open the task to download)` : ""].filter(Boolean).join("\n\n"));
    await db.query("COMMIT");
    messageId = id;
  } catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); }
  await sendQueuedTaskNotification(notification);
  return messageId;
}

export async function downloadTaskAttachment(taskId: string, attachmentId: string) {
  const result = await getDatabase().query<{ filename: string; bytes: Buffer }>(`SELECT f.filename,f.bytes FROM plan_task_attachment f
    JOIN plan_task_message m ON m.id=f.message_id WHERE f.id=$1 AND m.task_id=$2`, [attachmentId, taskId]);
  if (!result.rowCount) throw new PlanError("Attachment not found.", 404);
  const { filename, bytes } = result.rows[0];
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, value => `%${value.charCodeAt(0).toString(16)}`);
  return new Response(new Uint8Array(bytes), { headers: {
    "Content-Type": "application/octet-stream", "Content-Length": String(bytes.length),
    "Content-Disposition": `attachment; filename="download"; filename*=UTF-8''${encoded}`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
  } });
}

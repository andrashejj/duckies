import { useEffect, useState, type SubmitEvent } from "react";
import { formatDay, statusLabels } from "../../lib/plan";
import { MAX_TASK_FILES, MAX_TASK_FILE_BYTES, type TaskDiscussion } from "../../lib/plan-discussion";
import { bButton, bField, bSecondary, monoTag, subheading } from "../../lib/plan-ui";

const fileSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.ceil(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
const timestamp = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function PlanTaskDiscussion({ taskId }: { taskId: string }) {
  const [discussion, setDiscussion] = useState<TaskDiscussion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"comment" | "update">("comment");
  const [files, setFiles] = useState<File[]>([]);
  const endpoint = `/api/plan/tasks/${taskId}/discussion`;

  async function load(signal?: AbortSignal) {
    setLoading(true); setError("");
    try {
      const response = await fetch(endpoint, { signal });
      const data = await response.json();
      if (!response.ok) {
        if ([401, 403, 404].includes(response.status)) setDiscussion(null);
        throw new Error(data.error || "Could not load the discussion.");
      }
      setDiscussion(data);
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : "Could not load the discussion. Try refreshing.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [taskId]);

  function chooseFiles(selected: File[]) {
    if (selected.length > MAX_TASK_FILES || selected.reduce((total, file) => total + file.size, 0) > MAX_TASK_FILE_BYTES) {
      setError("Choose up to three files, totalling 3 MB or less."); return;
    }
    if (selected.some(file => !file.size)) { setError("Empty files cannot be attached."); return; }
    setFiles(selected); setError("");
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(""); setNotice(""); setSaving(true);
    const form = new FormData();
    form.set("kind", kind); form.set("body", body);
    for (const file of files) form.append("files", file);
    try {
      const response = await fetch(endpoint, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) {
        if ([401, 403].includes(response.status)) setDiscussion(current => current && { ...current, canEdit: false });
        throw new Error(data.error || "Could not save your message. Your draft is still here.");
      }
      setBody(""); setFiles([]); setNotice(kind === "update" ? "Progress update added." : "Comment added.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your message. Your draft is still here."); }
    finally { setSaving(false); }
  }

  const entries = discussion ? [
    ...discussion.messages.map(message => ({ ...message, type: "message" as const, key: `message-${message.id}` })),
    ...discussion.events.map(event => ({ ...event, type: "event" as const, key: `event-${event.id}` })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.key.localeCompare(b.key)) : [];

  return <div className="text-fg">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <a href="/branding-plan/board" className={bSecondary}>Back to board</a>
      <button type="button" disabled={loading || saving} onClick={() => void load()} className={bSecondary}>{loading ? "Loading…" : "Refresh discussion"}</button>
    </div>
    {error && <p role="alert" className="my-4 break-words text-alert">{error}</p>}
    {notice && <p role="status" className="my-4 text-accent-text">{notice}</p>}
    {!discussion && loading && <p role="status" className="py-8 text-fg-muted">Loading comments and files…</p>}
    {discussion && <>
      <section aria-label="Task details" className="mb-8 border-y border-line py-6">
        <p className={`m-0 mb-3 ${monoTag} text-accent-text`}>{discussion.milestoneTitle} · {statusLabels[discussion.task.status]}</p>
        <h2 className={`${subheading} max-w-[70ch] break-words`}>{discussion.task.text}</h2>
        <p className="mt-4 mb-0 text-fg-muted">{discussion.ownerName}{discussion.task.dueOn && ` · Due ${formatDay(discussion.task.dueOn)}`}</p>
      </section>
      <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section aria-labelledby="task-activity-title" className="min-w-0">
          <h2 id="task-activity-title" className={subheading}>Activity</h2>
          {!entries.length && <p className="mt-4 max-w-[60ch] text-fg-muted">No comments or updates yet. Add a quote, ask a question or share what happened.</p>}
          <ol className="m-0 mt-5 list-none divide-y divide-line p-0">
            {entries.map(entry => <li key={entry.key} className="min-w-0 py-5 first:pt-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-semibold">{entry.authorName}</span>
                <span className={`${monoTag} text-fg-muted`}>{entry.type === "event" ? "Task changed" : entry.kind === "update" ? "Progress update" : "Comment"}</span>
                <time dateTime={entry.createdAt} className="text-sm text-fg-muted">{timestamp(entry.createdAt)}</time>
              </div>
              {entry.type === "event" ? <p className="mt-2 mb-0 text-fg-muted">{statusLabels[entry.status]} · {entry.ownerName}</p> : <>
                {entry.body && <p className="mt-3 mb-0 max-w-[70ch] whitespace-pre-wrap break-words leading-relaxed">{entry.body}</p>}
                {entry.attachments.length > 0 && <ul className="m-0 mt-3 list-none space-y-2 p-0">
                  {entry.attachments.map(file => <li key={file.id}>
                    <a href={`/api/plan/tasks/${taskId}/attachments/${file.id}`} className="inline-block min-h-11 max-w-full break-all py-2 text-accent-text underline underline-offset-4" download={file.filename}>Download {file.filename} <span className="text-sm text-fg-muted">({fileSize(file.size)})</span></a>
                  </li>)}
                </ul>}
              </>}
            </li>)}
          </ol>
        </section>
        <section aria-labelledby="task-message-title" className="order-first min-w-0 border-b border-line pb-6 lg:order-last lg:border-b-0 lg:pb-0">
          <h2 id="task-message-title" className={subheading}>Add to this task</h2>
          {discussion.canEdit ? <form onSubmit={submit} className="mt-5">
            <fieldset disabled={saving} className="m-0 grid min-w-0 gap-4 border-0 p-0 disabled:opacity-60">
              <label className="grid gap-2">Message type
                <select value={kind} onChange={event => setKind(event.target.value as "comment" | "update")} className={bField}>
                  <option value="comment">Comment</option><option value="update">Progress update</option>
                </select>
              </label>
              <label htmlFor="task-message-body" className="grid gap-2">Message</label>
                <textarea id="task-message-body" value={body} onChange={event => setBody(event.target.value)} maxLength={4000} rows={5} className={`${bField} resize-y`} placeholder="A question, a supplier quote, or what you’ve done…" />
              <label className="grid min-w-0 gap-2">Attachments
                <input type="file" multiple aria-describedby="task-file-help" className={`${bField} min-w-0 text-sm file:mr-3 file:border-0 file:bg-accent file:px-3 file:py-2 file:text-accent-fg`} onChange={event => { chooseFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ""; }} />
              </label>
              <p id="task-file-help" className="m-0 text-sm text-fg-muted">Up to three files, 3 MB in total. Only people with branding access can download them.</p>
              {files.length > 0 && <ul className="m-0 list-none space-y-1 p-0">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 break-all">{file.name} ({fileSize(file.size)})</span>
                <button type="button" onClick={() => setFiles(current => current.filter((_, i) => i !== index))} className="min-h-11 shrink-0 px-2 text-accent-text underline underline-offset-4" aria-label={`Remove ${file.name}`}>Remove</button>
              </li>)}</ul>}
              <button type="submit" disabled={!body.trim() && !files.length} className={`${bButton} justify-self-start`}>{saving ? "Saving…" : kind === "update" ? "Post update" : "Post comment"}</button>
            </fieldset>
          </form> : <p className="mt-4 text-fg-muted">You have viewing access. Ask Andras for edit access to add comments, updates and files.</p>}
        </section>
      </div>
    </>}
  </div>;
}

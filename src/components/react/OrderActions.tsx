import { useState } from "react";

type Status =
  | "PENDING"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "READY"
  | "FULFILLED"
  | "CANCELLED";

type Props = {
  orderId: string;
  currentStatus: Status;
  nextStatuses: Status[];
  statusLabel: Record<Status, string>;
};

export default function OrderActions({
  orderId,
  currentStatus,
  nextStatuses,
  statusLabel,
}: Props) {
  const [pending, setPending] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [adminNote, setAdminNote] = useState("");

  async function transition(to: Status) {
    setError(null);
    setPending(to);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          adminNote: adminNote.trim() || undefined,
          sendEmail,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Transition failed.");
        setPending(null);
        return;
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      setPending(null);
    }
  }

  if (nextStatuses.length === 0) {
    return (
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-[var(--color-ink-950)]/55">
        Terminal status — no further transitions.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/70">
        Optional note (included on the customer email)
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-[0.8rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] p-3 font-sans text-sm text-[var(--color-ink-950)] shadow-[2px_2px_0_0_var(--color-ink-950)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral-500)]"
          placeholder="Pickup is at the shack side, ask for Andras…"
        />
      </label>
      <label className="flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--color-ink-950)]/75">
        <input
          type="checkbox"
          checked={sendEmail}
          onChange={(e) => setSendEmail(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-coral-500)]"
        />
        Email customer about this change
      </label>
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((status) => (
          <button
            key={status}
            type="button"
            disabled={pending !== null}
            onClick={() => transition(status)}
            className={`rounded-full border-2 border-[var(--color-ink-950)] px-4 py-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] shadow-[3px_3px_0_0_var(--color-ink-950)] transition disabled:opacity-60 ${
              status === "CANCELLED"
                ? "bg-[var(--color-coral-500)] text-[var(--color-cream-soft)] hover:brightness-110"
                : "bg-[var(--color-sun-500)] text-[var(--color-ink-950)] hover:bg-[var(--color-coral-500)] hover:text-[var(--color-cream-soft)]"
            }`}
          >
            {pending === status
              ? "Saving…"
              : `→ ${statusLabel[status]}`}
          </button>
        ))}
      </div>
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--color-ink-950)]/55">
        Current: {statusLabel[currentStatus]}
      </p>
      {error && (
        <p className="rounded-[0.6rem] border border-[var(--color-coral-500)] bg-[var(--color-coral-500)]/10 p-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[var(--color-coral-500)]">
          {error}
        </p>
      )}
    </div>
  );
}

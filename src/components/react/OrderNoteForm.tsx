import { useState } from "react";

type Props = {
  orderId: string;
};

export default function OrderNoteForm({ orderId }: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Could not add note.");
        setSubmitting(false);
        return;
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="Internal note — only visible to admins."
        className="w-full rounded-[0.8rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] p-3 font-sans text-sm text-[var(--color-ink-950)] shadow-[2px_2px_0_0_var(--color-ink-950)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral-500)]"
      />
      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="cta-secondary py-2 px-4 text-[0.78rem] disabled:opacity-60"
        >
          {submitting ? "Adding…" : "Add internal note"}
        </button>
        {error && (
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--color-coral-500)]">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

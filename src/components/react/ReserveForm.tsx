import { useMemo, useState } from "react";

type ReserveResponse =
  | { ok: true; orderId: string; guestToken: string; whatsappUrl: string }
  | { ok: false; error: string };

type Props = {
  product: {
    productId: string;
    name: string;
  };
  sizes: string[];
  whatsappUrl: string;
};

export default function ReserveForm({ product, sizes, whatsappUrl }: Props) {
  const sizeOptions = useMemo(
    () => splitSizes(sizes),
    [sizes],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [kidName, setKidName] = useState("");
  const [size, setSize] = useState<string>(sizeOptions[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!name || !email) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
          },
          pickupMethod: "SESH",
          customerNote: customerNote.trim() || undefined,
          lines: [
            {
              productId: product.productId,
              quantity,
              size: size || undefined,
              kidName: kidName.trim() || undefined,
            },
          ],
        }),
      });
      const data: ReserveResponse = await res.json();
      if (!data.ok) {
        setError(data.error);
        setSubmitting(false);
        return;
      }
      window.location.href = `/orders/${data.orderId}?t=${data.guestToken}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Your name"
          value={name}
          onChange={setName}
          required
          autoComplete="name"
        />
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Kid's name"
          value={kidName}
          onChange={setKidName}
          placeholder="Who's it for?"
        />
        <Field
          label="Phone (optional)"
          value={phone}
          onChange={setPhone}
          autoComplete="tel"
          placeholder="+230 5 ..."
        />
      </div>

      {sizeOptions.length > 1 && (
        <div>
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/70">
            Size
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizeOptions.map((opt) => (
              <SizeChip
                key={opt}
                label={opt}
                checked={size === opt}
                onChange={() => setSize(opt)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-4">
        <label className="block font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/70">
          <span>Quantity</span>
          <input
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
            }
            className="mt-2 w-24 rounded-[0.8rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] px-3 py-2 font-sans text-sm text-[var(--color-ink-950)] shadow-[2px_2px_0_0_var(--color-ink-950)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral-500)]"
          />
        </label>
      </div>

      <label className="block font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/70">
        <span>Anything we should know? (optional)</span>
        <textarea
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-[0.9rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] p-3 font-sans text-sm text-[var(--color-ink-950)] shadow-[2px_2px_0_0_var(--color-ink-950)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral-500)]"
          placeholder="Sizing notes, pickup window, gift…"
        />
      </label>

      {error && (
        <p className="rounded-[0.8rem] border-2 border-[var(--color-coral-500)] bg-[var(--color-coral-500)]/10 p-3 font-mono text-[0.74rem] uppercase tracking-[0.14em] text-[var(--color-coral-500)]">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={submitting}
          className="cta-primary w-full justify-center disabled:opacity-60"
        >
          {submitting ? "Locking it in…" : `Reserve ${product.name}`}
        </button>
        <p className="text-center font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/55">
          Sizing questions?{" "}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-[var(--color-coral-500)] hover:underline"
          >
            DM us on WhatsApp →
          </a>
        </p>
      </div>
    </form>
  );
}

function splitSizes(sizes: string[]): string[] {
  return sizes
    .flatMap((s) => s.split(/\s*[·,]\s*/g))
    .map((s) => s.trim())
    .filter(Boolean);
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/70">
      <span>
        {label}
        {required && <span className="ml-1 text-[var(--color-coral-500)]">*</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[0.8rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] px-3 py-2 font-sans text-sm text-[var(--color-ink-950)] shadow-[2px_2px_0_0_var(--color-ink-950)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral-500)]"
      />
    </label>
  );
}

function SizeChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-full border-2 border-[var(--color-ink-950)] px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.16em] shadow-[2px_2px_0_0_var(--color-ink-950)] transition ${
        checked
          ? "bg-[var(--color-sun-500)] text-[var(--color-ink-950)]"
          : "bg-[var(--color-cream-soft)] text-[var(--color-ink-950)]/75 hover:bg-[var(--color-cream-deep)]"
      }`}
    >
      <input
        type="radio"
        name="size"
        value={label}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}

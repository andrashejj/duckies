import { useHydrated } from "./useHydrated";
import { useMemo, useState } from "react";
import { productSizes } from "../../lib/sizes";
import { ctaClass } from "../../lib/ui";

type ReserveResponse =
  | { ok: true; orderId: string; guestToken: string; whatsappUrl: string }
  | { ok: false; error: string };

type Props = {
  product: {
    productId: string;
    name: string;
  };
  familyKids?: { id: string; name: string }[];
  sizes: string[];
  whatsappUrl: string;
};

export default function ReserveForm({ product, sizes, whatsappUrl, familyKids = [] }: Props) {
  const ready = useHydrated();
  const sizeOptions = useMemo(
    () => productSizes(sizes),
    [sizes],
  );

  const [familyKidIds, setFamilyKidIds] = useState(familyKids.map(k => k.id));
  const [requestKey] = useState(() => crypto.randomUUID());
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
          requestKey,
          familyKidIds,
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
      <fieldset disabled={!ready} className="contents">
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

      {familyKids.length > 0 && <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 font-display font-bold">Share with family</legend>
        <p className="mb-3 text-sm text-fg-muted">The legal guardians of these duckies can see this reservation in their family order history.</p>
        {familyKids.map(kid => <label className="flex min-h-10 items-center gap-3" key={kid.id}><input type="checkbox" checked={familyKidIds.includes(kid.id)} onChange={event => setFamilyKidIds(ids => event.target.checked ? [...ids,kid.id] : ids.filter(id=>id!==kid.id))} />{kid.name}</label>)}
      </fieldset>}
      {sizeOptions.length > 1 && (
        <div>
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-fg/70">
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
        <label className="block font-mono text-[0.66rem] uppercase tracking-[0.18em] text-fg/70">
          <span>Quantity</span>
          <input
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
            }
            className="mt-2 w-24 rounded-[0.8rem] border-2 border-edge bg-surface px-3 py-2 font-sans text-sm text-fg shadow-sticker-xs focus:outline-none focus:ring-2 focus:ring-coral-500"
          />
        </label>
      </div>

      <label className="block font-mono text-[0.66rem] uppercase tracking-[0.18em] text-fg/70">
        <span>Anything we should know? (optional)</span>
        <textarea
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-[0.9rem] border-2 border-edge bg-surface p-3 font-sans text-sm text-fg shadow-sticker-xs focus:outline-none focus:ring-2 focus:ring-coral-500"
          placeholder="Sizing notes, pickup window, gift…"
        />
      </label>

      {error && (
        <p className="rounded-[0.8rem] border-2 border-coral-500 bg-coral-500/10 p-3 font-mono text-[0.74rem] uppercase tracking-[0.14em] text-coral-500">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={submitting}
          className={ctaClass("primary", "md", "w-full")}
        >
          {submitting ? "Locking it in…" : `Reserve ${product.name}`}
        </button>
        <p className="text-center font-mono text-[0.62rem] uppercase tracking-[0.18em] text-fg/55">
          Sizing questions?{" "}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-coral-500 hover:underline"
          >
            DM us on WhatsApp →
          </a>
        </p>
      </div>
      </fieldset>
    </form>
  );
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
    <label className="block font-mono text-[0.66rem] uppercase tracking-[0.18em] text-fg/70">
      <span>
        {label}
        {required && <span className="ml-1 text-coral-500">*</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[0.8rem] border-2 border-edge bg-surface px-3 py-2 font-sans text-sm text-fg shadow-sticker-xs focus:outline-none focus:ring-2 focus:ring-coral-500"
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
      className={`cursor-pointer rounded-full border-2 border-edge px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.16em] shadow-sticker-xs transition ${
        checked
          ? "bg-sun-500 text-ink-950"
          : "bg-surface text-fg/75 hover:bg-surface-2"
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

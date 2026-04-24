import { useStore } from "@nanostores/react";
import { useState } from "react";

import {
  cart,
  cartSubtotalCents,
  clearCart,
  type CartLine,
} from "../../lib/cart";
import { formatPrice } from "../../lib/format";

type PaymentMethod = "JUICE" | "CASH" | "BANK";
type PickupMethod = "SESH" | "ARRANGE";

type CheckoutResponse =
  | { ok: true; orderId: string; guestToken: string }
  | { ok: false; error: string };

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; tag: string }[] = [
  { value: "JUICE", label: "JUICE by MCB", tag: "Mobile · MUR" },
  { value: "CASH", label: "Cash at sesh", tag: "Wed/Fri 4-6pm, Tamarin" },
  { value: "BANK", label: "Bank transfer", tag: "Details by email" },
];

const PICKUP_OPTIONS: { value: PickupMethod; label: string; detail: string }[] = [
  {
    value: "SESH",
    label: "Pickup at sesh",
    detail: "Wednesday or Friday, 4-6pm, Tamarin Bay.",
  },
  {
    value: "ARRANGE",
    label: "Arrange in chat",
    detail: "We'll message you to line it up.",
  },
];

function buildPayload(
  lines: CartLine[],
  form: {
    name: string;
    email: string;
    phone: string;
    paymentMethod: PaymentMethod;
    pickupMethod: PickupMethod;
    customerNote: string;
  },
) {
  return {
    customer: {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
    },
    paymentMethod: form.paymentMethod,
    pickupMethod: form.pickupMethod,
    customerNote: form.customerNote.trim() || undefined,
    lines: lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      size: l.size,
    })),
  };
}

export default function CheckoutForm() {
  const { lines } = useStore(cart);
  const subtotalCents = useStore(cartSubtotalCents);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("JUICE");
  const [pickupMethod, setPickupMethod] = useState<PickupMethod>("SESH");
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (lines.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[var(--color-coral-500)]">
          Nothing to check out
        </p>
        <p
          className="mt-3 font-display text-2xl text-[var(--color-ink-950)]"
          style={{ fontVariationSettings: "'wdth' 110", fontWeight: 700 }}
        >
          Your cart is empty.
        </p>
        <a className="cta-primary mt-6 inline-flex" href="/shop">
          Back to the drop
        </a>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!name || !email) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPayload(lines, {
            name,
            email,
            phone,
            paymentMethod,
            pickupMethod,
            customerNote,
          }),
        ),
      });
      const data: CheckoutResponse = await res.json();
      if (!data.ok) {
        setError(data.error);
        setSubmitting(false);
        return;
      }
      clearCart();
      window.location.href = `/orders/${data.orderId}?t=${data.guestToken}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-start"
    >
      <div className="space-y-8">
        <fieldset className="surface-card space-y-4 p-6">
          <legend className="section-kicker">Contact</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
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
          <Field
            label="Phone (optional)"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
            placeholder="+230 5 ..."
          />
          <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/55">
            We'll email you an order summary and payment instructions.
          </p>
        </fieldset>

        <fieldset className="surface-card space-y-4 p-6">
          <legend className="section-kicker">Payment</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {PAYMENT_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                tag={opt.tag}
                checked={paymentMethod === opt.value}
                onChange={() => setPaymentMethod(opt.value)}
                name="paymentMethod"
                value={opt.value}
              />
            ))}
          </div>
          <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/55">
            No card processors. Pay after we confirm your order by email.
          </p>
        </fieldset>

        <fieldset className="surface-card space-y-4 p-6">
          <legend className="section-kicker">Pickup</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {PICKUP_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                tag={opt.detail}
                checked={pickupMethod === opt.value}
                onChange={() => setPickupMethod(opt.value)}
                name="pickupMethod"
                value={opt.value}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="surface-card space-y-3 p-6">
          <legend className="section-kicker">Notes</legend>
          <label className="block font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/70">
            <span>Anything we should know?</span>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-[0.9rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] p-3 font-sans text-sm text-[var(--color-ink-950)] shadow-[2px_2px_0_0_var(--color-ink-950)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral-500)]"
              placeholder="Pickup window, sizing questions, gift note…"
            />
          </label>
        </fieldset>
      </div>

      <aside className="surface-card sticky top-28 space-y-5 p-6">
        <p className="section-kicker">Your order</p>
        <ul className="space-y-2 text-sm">
          {lines.map((line) => (
            <li
              key={`${line.productId}::${line.size ?? ""}`}
              className="flex justify-between gap-3 border-b border-dashed border-[var(--color-ink-950)]/20 pb-2 last:border-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[var(--color-ink-950)]" style={{ fontVariationSettings: "'wdth' 110", fontWeight: 700 }}>
                  {line.name}
                </span>
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--color-ink-950)]/55">
                  {line.size ?? "One size"} · ×{line.quantity}
                </span>
              </span>
              <span className="whitespace-nowrap font-mono text-[0.78rem] text-[var(--color-ink-950)]">
                {formatPrice(line.priceCents * line.quantity, line.currency)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t-2 border-[var(--color-ink-950)] pt-4 font-mono text-[0.82rem]">
          <div className="flex justify-between">
            <dt className="text-[var(--color-ink-950)]/70">Subtotal</dt>
            <dd className="text-[var(--color-ink-950)]">
              {formatPrice(subtotalCents)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-ink-950)]/70">Shipping</dt>
            <dd className="text-[var(--color-ink-950)]">Pickup · Rs 0</dd>
          </div>
          <div className="mt-2 flex justify-between text-base">
            <dt
              className="font-display text-[var(--color-ink-950)]"
              style={{ fontVariationSettings: "'wdth' 110", fontWeight: 700 }}
            >
              Total
            </dt>
            <dd
              className="font-display text-[var(--color-ink-950)]"
              style={{ fontVariationSettings: "'wdth' 110", fontWeight: 700 }}
            >
              {formatPrice(subtotalCents)}
            </dd>
          </div>
        </dl>
        {error && (
          <p className="rounded-[0.8rem] border-2 border-[var(--color-coral-500)] bg-[var(--color-coral-500)]/10 p-3 font-mono text-[0.74rem] uppercase tracking-[0.14em] text-[var(--color-coral-500)]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="cta-primary w-full justify-center disabled:opacity-60"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/55">
          By placing the order you'll get a confirmation email with payment
          details. No charge is made now.
        </p>
      </aside>
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

function OptionCard({
  label,
  tag,
  checked,
  onChange,
  name,
  value,
}: {
  label: string;
  tag: string;
  checked: boolean;
  onChange: () => void;
  name: string;
  value: string;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-2 rounded-[1rem] border-2 border-[var(--color-ink-950)] p-4 shadow-[3px_3px_0_0_var(--color-ink-950)] transition ${
        checked
          ? "bg-[var(--color-sun-500)] text-[var(--color-ink-950)]"
          : "bg-[var(--color-cream-soft)] text-[var(--color-ink-950)] hover:bg-[var(--color-cream-deep)]"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className="font-display text-base"
        style={{ fontVariationSettings: "'wdth' 110", fontWeight: 700 }}
      >
        {label}
      </span>
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--color-ink-950)]/65">
        {tag}
      </span>
    </label>
  );
}

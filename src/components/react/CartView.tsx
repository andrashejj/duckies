import { useStore } from "@nanostores/react";

import {
  cart,
  cartSubtotalCents,
  clearCart,
  removeLine,
  setQuantity,
} from "../../lib/cart";
import { formatPrice } from "../../lib/format";

export default function CartView() {
  const { lines } = useStore(cart);
  const subtotalCents = useStore(cartSubtotalCents);

  if (lines.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[var(--color-coral-500)]">
          Empty lineup
        </p>
        <p
          className="mt-3 font-display text-2xl text-[var(--color-ink-950)]"
          style={{ fontVariationSettings: "'wdth' 110", fontWeight: 700 }}
        >
          Nothing in the bag yet.
        </p>
        <p className="mt-2 text-[0.95rem] leading-7 text-[var(--color-ink-950)]/70">
          Head back to the drop and stack a few pieces — pickup is at Wednesday
          or Friday sesh, or we arrange in chat.
        </p>
        <a className="cta-primary mt-6 inline-flex" href="/shop">
          See the drop
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr] lg:items-start">
      <ul className="space-y-4">
        {lines.map((line) => {
          const k = `${line.productId}::${line.size ?? ""}`;
          return (
            <li
              key={k}
              className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
            >
              <div
                className="flex h-20 w-20 flex-none items-center justify-center rounded-[1rem] border-2 border-[var(--color-ink-950)] font-display text-[0.9rem] uppercase tracking-[-0.02em] shadow-[3px_3px_0_0_var(--color-ink-950)]"
                style={{
                  background: `var(--color-${line.colorway}-500, var(--color-ink-950))`,
                  color:
                    line.colorway === "ink" || line.colorway === "coral"
                      ? "var(--color-cream-soft)"
                      : "var(--color-ink-950)",
                }}
              >
                ✦
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={`/shop/${line.slug}`}
                  className="font-display text-lg text-[var(--color-ink-950)] hover:text-[var(--color-coral-500)]"
                  style={{ fontVariationSettings: "'wdth' 110", fontWeight: 700 }}
                >
                  {line.name}
                </a>
                <p className="mt-0.5 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/60">
                  {line.kind}
                  {line.size ? ` · ${line.size}` : ""}
                </p>
                <p className="mt-2 font-mono text-[0.78rem] tracking-[0.04em] text-[var(--color-ink-950)]/80">
                  {formatPrice(line.priceCents, line.currency)} each
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center overflow-hidden rounded-full border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] shadow-[2px_2px_0_0_var(--color-ink-950)]">
                  <button
                    type="button"
                    onClick={() => setQuantity(line, line.quantity - 1)}
                    aria-label="Decrease quantity"
                    className="px-3 py-1 font-mono text-base text-[var(--color-ink-950)] hover:bg-[var(--color-sun-500)]"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center font-mono text-sm font-semibold text-[var(--color-ink-950)]">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(line, line.quantity + 1)}
                    aria-label="Increase quantity"
                    className="px-3 py-1 font-mono text-base text-[var(--color-ink-950)] hover:bg-[var(--color-sun-500)]"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(line)}
                  className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/60 underline-offset-4 hover:text-[var(--color-coral-500)] hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear the whole cart?")) clearCart();
            }}
            className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-ink-950)]/60 underline-offset-4 hover:text-[var(--color-coral-500)] hover:underline"
          >
            Clear cart
          </button>
        </li>
      </ul>

      <aside className="surface-card sticky top-28 space-y-5 p-6">
        <p className="section-kicker">Order summary</p>
        <dl className="space-y-2 font-mono text-[0.82rem]">
          <div className="flex justify-between">
            <dt className="text-[var(--color-ink-950)]/70">Subtotal</dt>
            <dd className="text-[var(--color-ink-950)]">
              {formatPrice(subtotalCents)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-ink-950)]/70">Shipping</dt>
            <dd className="text-[var(--color-ink-950)]">Pickup at sesh · Rs 0</dd>
          </div>
          <div className="mt-2 flex justify-between border-t-2 border-[var(--color-ink-950)] pt-3 text-base">
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
        <a className="cta-primary w-full justify-center" href="/checkout">
          Go to checkout →
        </a>
        <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/55">
          Payment on confirmation · Juice, cash, or bank transfer.
        </p>
      </aside>
    </div>
  );
}

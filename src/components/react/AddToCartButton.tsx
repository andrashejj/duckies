import { useMemo, useState } from "react";

import { addToCart, type CartLine } from "../../lib/cart";
import { formatPrice } from "../../lib/format";

type Props = {
  product: Omit<CartLine, "quantity" | "size">;
  sizes: string[];
  variant?: "primary" | "block";
};

export default function AddToCartButton({ product, sizes, variant = "primary" }: Props) {
  const options = useMemo(() => (sizes.length ? sizes : ["One size"]), [sizes]);
  const [size, setSize] = useState(options[0]);
  const [flash, setFlash] = useState<"idle" | "added">("idle");

  function handleAdd() {
    addToCart({ ...product, size }, 1);
    setFlash("added");
    window.setTimeout(() => setFlash("idle"), 1400);
  }

  return (
    <div className={variant === "block" ? "space-y-3" : "space-y-2"}>
      {options.length > 1 && (
        <label className="flex flex-col gap-1 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[var(--color-ink-950)]/70">
          Size
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="rounded-[0.75rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] px-3 py-2 font-mono text-[0.82rem] uppercase tracking-[0.12em] text-[var(--color-ink-950)] shadow-[2px_2px_0_0_var(--color-ink-950)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral-500)]"
          >
            {options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="cta-primary w-full justify-center"
        aria-live="polite"
      >
        {flash === "added"
          ? "Added ✦"
          : `Add to cart — ${formatPrice(product.priceCents, product.currency)}`}
      </button>
    </div>
  );
}

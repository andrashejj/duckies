import { useStore } from "@nanostores/react";

import { cartItemCount } from "../../lib/cart";

type Props = {
  href?: string;
  label?: string;
};

export default function CartBadge({ href = "/cart", label = "Cart" }: Props) {
  const count = useStore(cartItemCount);
  return (
    <a
      href={href}
      className="chip relative !bg-[var(--color-sun-500)] !text-[var(--color-ink-950)] hover:!bg-[var(--color-coral-500)] hover:!text-[var(--color-cream-soft)]"
      aria-label={`${label}, ${count} item${count === 1 ? "" : "s"}`}
    >
      <span>{label}</span>
      <span
        className={`ml-2 inline-flex min-w-[1.4rem] items-center justify-center rounded-full border border-[var(--color-ink-950)] px-1.5 font-mono text-[0.66rem] font-semibold ${
          count > 0
            ? "bg-[var(--color-ink-950)] text-[var(--color-sun-500)]"
            : "bg-transparent text-[var(--color-ink-950)]/60"
        }`}
      >
        {count}
      </span>
    </a>
  );
}

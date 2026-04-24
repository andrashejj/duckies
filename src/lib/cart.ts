import { persistentAtom } from "@nanostores/persistent";
import { computed } from "nanostores";

export type CartLine = {
  productId: string;
  slug: string;
  sku: string;
  name: string;
  kind: string;
  priceCents: number;
  currency: string;
  colorway: string;
  quantity: number;
  size?: string;
};

export type Cart = {
  lines: CartLine[];
  updatedAt: number;
};

const EMPTY: Cart = { lines: [], updatedAt: 0 };

export const cart = persistentAtom<Cart>("sunset-duckies:cart:v1", EMPTY, {
  encode: JSON.stringify,
  decode: (str) => {
    try {
      const parsed = JSON.parse(str);
      if (!parsed || !Array.isArray(parsed.lines)) return EMPTY;
      return parsed as Cart;
    } catch {
      return EMPTY;
    }
  },
});

export const cartItemCount = computed(cart, (c) =>
  c.lines.reduce((sum, l) => sum + l.quantity, 0),
);

export const cartSubtotalCents = computed(cart, (c) =>
  c.lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0),
);

function keyOf(line: Pick<CartLine, "productId" | "size">): string {
  return `${line.productId}::${line.size ?? ""}`;
}

export function addToCart(line: Omit<CartLine, "quantity">, quantity = 1): void {
  const current = cart.get();
  const key = keyOf(line);
  const existingIdx = current.lines.findIndex((l) => keyOf(l) === key);
  const nextLines =
    existingIdx >= 0
      ? current.lines.map((l, i) =>
          i === existingIdx ? { ...l, quantity: l.quantity + quantity } : l,
        )
      : [...current.lines, { ...line, quantity }];
  cart.set({ lines: nextLines, updatedAt: Date.now() });
}

export function setQuantity(
  line: Pick<CartLine, "productId" | "size">,
  quantity: number,
): void {
  const current = cart.get();
  const key = keyOf(line);
  const nextLines =
    quantity <= 0
      ? current.lines.filter((l) => keyOf(l) !== key)
      : current.lines.map((l) =>
          keyOf(l) === key ? { ...l, quantity } : l,
        );
  cart.set({ lines: nextLines, updatedAt: Date.now() });
}

export function removeLine(line: Pick<CartLine, "productId" | "size">): void {
  setQuantity(line, 0);
}

export function clearCart(): void {
  cart.set({ lines: [], updatedAt: Date.now() });
}

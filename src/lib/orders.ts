import { randomBytes } from "node:crypto";

import type { Order, OrderItem, Prisma } from "@prisma/client";
import { OrderEventType } from "@prisma/client";
import { z } from "zod";

import { prisma } from "./prisma";

export const reserveSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    email: z.string().trim().email("Valid email is required").max(200),
    phone: z.string().trim().max(40).optional(),
  }),
  pickupMethod: z.enum(["SESH", "ARRANGE"]).default("SESH"),
  customerNote: z.string().trim().max(1000).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
        size: z.string().trim().max(60).optional(),
        kidName: z.string().trim().max(120).optional(),
      }),
    )
    .min(1, "Reservation is empty")
    .max(40),
});

export type ReserveInput = z.infer<typeof reserveSchema>;

export type OrderWithItems = Order & { items: OrderItem[] };

export async function createReservation(
  input: ReserveInput,
  opts: { userId?: string | null } = {},
): Promise<OrderWithItems> {
  const productIds = input.lines.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });

  if (products.length !== new Set(productIds).size) {
    throw new ReservationError("One or more items are no longer available.");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotalCents = 0;
  const itemsData: Omit<Prisma.OrderItemCreateManyInput, "orderId">[] = input.lines.map(
    (line) => {
      const product = productMap.get(line.productId);
      if (!product) {
        throw new ReservationError(`Product ${line.productId} is unavailable.`);
      }
      if (product.stock !== null && product.stock < line.quantity) {
        throw new ReservationError(`${product.name} is low on stock.`);
      }
      const lineTotalCents = product.priceCents * line.quantity;
      subtotalCents += lineTotalCents;
      return {
        productId: product.id,
        sku: product.sku,
        nameSnapshot: product.name,
        priceCentsSnapshot: product.priceCents,
        quantity: line.quantity,
        size: line.size,
        kidName: line.kidName,
        lineTotalCents,
      };
    },
  );

  const totalCents = subtotalCents;
  const guestToken = randomBytes(24).toString("hex");

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        guestToken,
        userId: opts.userId ?? null,
        email: input.customer.email.toLowerCase(),
        name: input.customer.name,
        phone: input.customer.phone,
        pickupMethod: input.pickupMethod,
        customerNote: input.customerNote,
        subtotalCents,
        totalCents,
        items: { createMany: { data: itemsData } },
        events: {
          create: {
            type: OrderEventType.CREATED,
            actorId: opts.userId ?? null,
            message: opts.userId
              ? "Reservation placed (signed-in member)."
              : "Reservation placed (guest).",
          },
        },
      },
      include: { items: true },
    });

    for (const line of input.lines) {
      const product = productMap.get(line.productId);
      if (product?.stock != null) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity } },
        });
      }
    }

    return created;
  });

  return order;
}

export class ReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReservationError";
  }
}

export async function getOrderForGuest(
  id: string,
  token: string,
): Promise<OrderWithItems | null> {
  const order = await prisma.order.findFirst({
    where: { id, guestToken: token },
    include: { items: true },
  });
  return order;
}

export function buildReservationWhatsappUrl(
  baseWhatsappUrl: string,
  order: {
    id: string;
    items: {
      quantity: number;
      nameSnapshot: string;
      size?: string | null;
      kidName?: string | null;
    }[];
  },
): string {
  const lines = order.items
    .map((i) => {
      const sizePart = i.size ? ` (size ${i.size})` : "";
      const kidPart = i.kidName ? ` for ${i.kidName}` : "";
      return `· ${i.quantity} × ${i.nameSnapshot}${sizePart}${kidPart}`;
    })
    .join("\n");
  const shortId = order.id.slice(-6).toUpperCase();
  const message = [
    `Yo Duckies — locking in reservation ${shortId}.`,
    "",
    lines,
    "",
    "Pickup at next sesh.",
  ].join("\n");
  const encoded = encodeURIComponent(message);
  if (baseWhatsappUrl.includes("?")) {
    return `${baseWhatsappUrl}&text=${encoded}`;
  }
  return `${baseWhatsappUrl}?text=${encoded}`;
}

import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import type { Order, OrderItem } from "../generated/prisma/client";
import { OrderEventType, Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";
import { availableProductWhere } from "./products";
import { productSizes } from "./sizes";

export const reserveSchema = z.object({
  requestKey: z.uuid(),
  customer: z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    email: z.email("Valid email is required").max(200).transform(email => email.toLowerCase()),
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
): Promise<OrderWithItems & { replayed: boolean }> {
  const productIds = [...new Set(input.lines.map(line => line.productId))].sort();
  const requestHash = createHash("sha256").update(JSON.stringify({ input, userId: opts.userId ?? null })).digest("hex");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.requestKey}, 0))`;
    const previous = await tx.order.findUnique({ where: { requestKey: input.requestKey }, include: { items: true } });
    if (previous) {
      if (previous.requestHash !== requestHash) throw new ReservationError("This request has already been used. Please start a new reservation.");
      return { ...previous, replayed: true };
    }
    // Lock in a stable order, then read stock and prices inside the transaction.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE id IN (${Prisma.join(productIds)}) ORDER BY id FOR UPDATE`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Drop" WHERE id IN (SELECT "dropId" FROM "Product" WHERE id IN (${Prisma.join(productIds)})) ORDER BY id FOR SHARE`);
    const products = await tx.product.findMany({ where: { id: { in: productIds }, ...availableProductWhere() } });
    if (products.length !== productIds.length) throw new ReservationError("One or more items are no longer available.");
    const productMap = new Map(products.map(product => [product.id, product]));
    const quantities = new Map<string, number>();
    let subtotalCents = 0;
    const itemsData = input.lines.map(line => {
      const product = productMap.get(line.productId)!;
      const choices = productSizes(product.sizes);
      if ((choices.length > 0 && (!line.size || !choices.includes(line.size))) || (choices.length === 0 && line.size)) {
        throw new ReservationError(`Choose an available size for ${product.name}.`);
      }
      if (product.currency !== "MUR") throw new ReservationError("This product is not available in the shop currency.");
      quantities.set(product.id, (quantities.get(product.id) ?? 0) + line.quantity);
      const lineTotalCents = product.priceCents * line.quantity;
      subtotalCents += lineTotalCents;
      return { productId: product.id, sku: product.sku, nameSnapshot: product.name,
        priceCentsSnapshot: product.priceCents, quantity: line.quantity, size: line.size,
        kidName: line.kidName, lineTotalCents, stockReserved: product.stock !== null };
    });
    for (const [id, quantity] of quantities) {
      const product = productMap.get(id)!;
      if (product.stock !== null) {
        if (product.stock < quantity) throw new ReservationError(`${product.name} does not have enough stock.`);
        await tx.product.update({ where: { id }, data: { stock: { decrement: quantity } } });
      }
    }
    const order = await tx.order.create({
      data: {
        requestKey: input.requestKey, requestHash, guestToken: randomBytes(24).toString("hex"),
        userId: opts.userId ?? null, email: input.customer.email.toLowerCase(),
        name: input.customer.name, phone: input.customer.phone,
        pickupMethod: input.pickupMethod, customerNote: input.customerNote,
        subtotalCents, totalCents: subtotalCents,
        items: { createMany: { data: itemsData } },
        events: { create: { type: OrderEventType.CREATED, actorId: opts.userId ?? null,
          message: opts.userId ? "Reservation placed (signed-in customer)." : "Reservation placed (guest)." } },
      }, include: { items: true },
    });
    return { ...order, replayed: false };
  }, { timeout: 15000 });
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
  // The configured WhatsApp link is a group invitation, which does not support
  // prefilled messages. Never attach reservation or child details to its URL.
  void order;
  return baseWhatsappUrl;
}

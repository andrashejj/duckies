import { randomBytes } from "node:crypto";

import type { Order, OrderItem, Prisma } from "@prisma/client";
import { OrderEventType } from "@prisma/client";
import { z } from "zod";

import { prisma } from "./prisma";

export const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    email: z.string().trim().email("Valid email is required").max(200),
    phone: z.string().trim().max(40).optional(),
  }),
  paymentMethod: z.enum(["JUICE", "CASH", "BANK"]),
  pickupMethod: z.enum(["SESH", "ARRANGE"]),
  customerNote: z.string().trim().max(1000).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
        size: z.string().trim().max(60).optional(),
      }),
    )
    .min(1, "Cart is empty")
    .max(40),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type OrderWithItems = Order & { items: OrderItem[] };

export async function createOrder(input: CheckoutInput): Promise<OrderWithItems> {
  const productIds = input.lines.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });

  if (products.length !== new Set(productIds).size) {
    throw new CheckoutError("One or more items are no longer available.");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotalCents = 0;
  const itemsData: Omit<Prisma.OrderItemCreateManyInput, "orderId">[] = input.lines.map(
    (line) => {
      const product = productMap.get(line.productId);
      if (!product) {
        throw new CheckoutError(`Product ${line.productId} is unavailable.`);
      }
      if (product.stock !== null && product.stock < line.quantity) {
        throw new CheckoutError(`${product.name} is low on stock.`);
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
        email: input.customer.email.toLowerCase(),
        name: input.customer.name,
        phone: input.customer.phone,
        paymentMethod: input.paymentMethod,
        pickupMethod: input.pickupMethod,
        customerNote: input.customerNote,
        subtotalCents,
        totalCents,
        items: { createMany: { data: itemsData } },
        events: {
          create: {
            type: OrderEventType.CREATED,
            message: "Order placed via checkout.",
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

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
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

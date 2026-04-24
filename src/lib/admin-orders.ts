import {
  OrderEventType,
  OrderStatus,
  type OrderEvent,
  type OrderItem,
  type Order,
} from "@prisma/client";

import { sendOrderStatusEmail } from "./email/send";
import type { OrderStatusVariant } from "../emails/OrderStatus";
import { prisma } from "./prisma";

export type OrderWithDetails = Order & {
  items: OrderItem[];
  events: OrderEvent[];
};

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [
    OrderStatus.AWAITING_PAYMENT,
    OrderStatus.PAID,
    OrderStatus.CANCELLED,
  ],
  AWAITING_PAYMENT: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.FULFILLED, OrderStatus.CANCELLED],
  FULFILLED: [],
  CANCELLED: [],
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  READY: "Ready for pickup",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: "var(--color-sun-500)",
  AWAITING_PAYMENT: "var(--color-sun-500)",
  PAID: "var(--color-teal-500)",
  READY: "var(--color-teal-500)",
  FULFILLED: "var(--color-lilac-400)",
  CANCELLED: "var(--color-coral-500)",
};

const statusToEmailVariant: Partial<Record<OrderStatus, OrderStatusVariant>> = {
  PAID: "PAID",
  READY: "READY",
  FULFILLED: "FULFILLED",
  CANCELLED: "CANCELLED",
};

const statusToEventType: Record<OrderStatus, OrderEventType> = {
  PENDING: OrderEventType.NOTE,
  AWAITING_PAYMENT: OrderEventType.NOTE,
  PAID: OrderEventType.PAYMENT_CONFIRMED,
  READY: OrderEventType.READY,
  FULFILLED: OrderEventType.FULFILLED,
  CANCELLED: OrderEventType.CANCELLED,
};

export async function transitionOrder(opts: {
  orderId: string;
  to: OrderStatus;
  actorId: string;
  adminNote?: string | null;
  sendEmail?: boolean;
}): Promise<OrderWithDetails> {
  const { orderId, to, actorId, adminNote, sendEmail = true } = opts;

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!existing) {
    throw new Error("Order not found.");
  }

  const allowed = STATUS_TRANSITIONS[existing.status];
  if (!allowed.includes(to)) {
    throw new Error(
      `Can't move from ${STATUS_LABEL[existing.status]} to ${STATUS_LABEL[to]}.`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: to },
    });
    await tx.orderEvent.create({
      data: {
        orderId,
        type: statusToEventType[to],
        actorId,
        message: adminNote
          ? `Moved to ${STATUS_LABEL[to]} — ${adminNote}`
          : `Moved to ${STATUS_LABEL[to]}.`,
      },
    });
    return tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, events: { orderBy: { createdAt: "desc" } } },
    }) as Promise<OrderWithDetails>;
  });

  const emailVariant = statusToEmailVariant[to];
  if (sendEmail && emailVariant) {
    const result = await sendOrderStatusEmail(updated, emailVariant, adminNote);
    if (result.ok) {
      await prisma.orderEvent.create({
        data: {
          orderId,
          type: OrderEventType.EMAIL_SENT,
          actorId,
          message: `Email dispatched (${result.id}) · ${emailVariant}.`,
        },
      });
    } else {
      console.warn("[admin] email send failed:", result.error);
    }
  }

  return updated;
}

export async function addInternalNote(opts: {
  orderId: string;
  actorId: string;
  message: string;
}): Promise<OrderEvent> {
  return prisma.orderEvent.create({
    data: {
      orderId: opts.orderId,
      actorId: opts.actorId,
      type: OrderEventType.NOTE,
      message: opts.message,
    },
  });
}

export async function getOrderForAdmin(
  id: string,
): Promise<OrderWithDetails | null> {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "desc" } },
    },
  }) as Promise<OrderWithDetails | null>;
}

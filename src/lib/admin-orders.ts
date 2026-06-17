import {
  OrderEventType,
  OrderStatus,
  type OrderEvent,
  type OrderItem,
  type Order,
} from "../generated/prisma/client";

import { sendOrderStatusEmail } from "./email/send";
import type { OrderStatusVariant } from "../emails/OrderStatus";
import { prisma } from "./prisma";

export type OrderWithDetails = Order & {
  items: OrderItem[];
  events: OrderEvent[];
};

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.FULFILLED, OrderStatus.CANCELLED],
  FULFILLED: [],
  CANCELLED: [],
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  READY: "Ready for pickup",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: "var(--color-sun-500)",
  CONFIRMED: "var(--color-teal-500)",
  READY: "var(--color-teal-500)",
  FULFILLED: "var(--color-lilac-400)",
  CANCELLED: "var(--color-coral-500)",
};

const statusToEmailVariant: Partial<Record<OrderStatus, OrderStatusVariant>> = {
  CONFIRMED: "CONFIRMED",
  READY: "READY",
  FULFILLED: "FULFILLED",
  CANCELLED: "CANCELLED",
};

const statusToEventType: Record<OrderStatus, OrderEventType> = {
  PENDING: OrderEventType.NOTE,
  CONFIRMED: OrderEventType.CONFIRMED,
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

export async function markOrderPaid(opts: {
  orderId: string;
  actorId: string;
  note?: string | null;
}): Promise<OrderWithDetails> {
  const { orderId, actorId, note } = opts;
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) {
    throw new Error("Order not found.");
  }
  if (existing.paidAt) {
    throw new Error("Reservation is already marked paid.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { paidAt: new Date() },
    });
    await tx.orderEvent.create({
      data: {
        orderId,
        type: OrderEventType.PAID,
        actorId,
        message: note ? `Marked paid (cash) — ${note}` : "Marked paid (cash).",
      },
    });
    return tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, events: { orderBy: { createdAt: "desc" } } },
    }) as Promise<OrderWithDetails>;
  });
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

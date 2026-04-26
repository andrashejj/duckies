import type { APIRoute } from "astro";

import { site } from "../../data/site";
import {
  sendNewOrderAdminAlert,
  sendOrderConfirmation,
} from "../../lib/email/send";
import {
  ReservationError,
  buildReservationWhatsappUrl,
  createReservation,
  reserveSchema,
} from "../../lib/orders";
import { prisma } from "../../lib/prisma";
import { OrderEventType } from "@prisma/client";

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
  const session = locals.session;
  const userId = session?.user?.id ?? null;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = reserveSchema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Response.json(
      { ok: false, error: firstIssue?.message ?? "Invalid reservation payload." },
      { status: 400 },
    );
  }

  let order;
  try {
    order = await createReservation(parsed.data, { userId });
  } catch (err) {
    if (err instanceof ReservationError) {
      return Response.json({ ok: false, error: err.message }, { status: 400 });
    }
    console.error("[reserve] createReservation failed:", err);
    return Response.json(
      { ok: false, error: "Could not save the reservation. Try again in a minute." },
      { status: 500 },
    );
  }

  const emailResults = await Promise.allSettled([
    sendOrderConfirmation(order),
    sendNewOrderAdminAlert(order),
  ]);

  for (const result of emailResults) {
    if (result.status !== "fulfilled") {
      console.warn("[reserve] email send threw:", result.reason);
      continue;
    }
    if (result.value.ok) {
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          type: OrderEventType.EMAIL_SENT,
          message: `Email dispatched (${result.value.id}).`,
        },
      });
    } else {
      console.warn("[reserve] email send failed:", result.value.error);
    }
  }

  return Response.json({
    ok: true,
    orderId: order.id,
    guestToken: order.guestToken,
    whatsappUrl: buildReservationWhatsappUrl(site.whatsappUrl, order),
  });
};

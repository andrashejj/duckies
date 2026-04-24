import type { APIRoute } from "astro";

import {
  sendNewOrderAdminAlert,
  sendOrderConfirmation,
} from "../../lib/email/send";
import {
  CheckoutError,
  checkoutSchema,
  createOrder,
} from "../../lib/orders";
import { prisma } from "../../lib/prisma";
import { OrderEventType } from "@prisma/client";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Response.json(
      { ok: false, error: firstIssue?.message ?? "Invalid checkout payload." },
      { status: 400 },
    );
  }

  let order;
  try {
    order = await createOrder(parsed.data);
  } catch (err) {
    if (err instanceof CheckoutError) {
      return Response.json({ ok: false, error: err.message }, { status: 400 });
    }
    console.error("[checkout] createOrder failed:", err);
    return Response.json(
      { ok: false, error: "Could not create the order. Try again in a minute." },
      { status: 500 },
    );
  }

  // Fire-and-forget emails — order is persisted even if mail fails.
  const emailResults = await Promise.allSettled([
    sendOrderConfirmation(order),
    sendNewOrderAdminAlert(order),
  ]);

  for (const result of emailResults) {
    if (result.status === "fulfilled" && result.value.ok) {
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          type: OrderEventType.EMAIL_SENT,
          message: `Email dispatched (${result.value.id}).`,
        },
      });
    } else if (result.status === "fulfilled") {
      console.warn("[checkout] email send failed:", result.value.error);
    } else {
      console.warn("[checkout] email send threw:", result.reason);
    }
  }

  return Response.json({
    ok: true,
    orderId: order.id,
    guestToken: order.guestToken,
  });
};

import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { getDatabase } from "../../lib/server/db";

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
import { OrderEventType } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

export const prerender = false;

export const POST: APIRoute = async ({ locals, request, clientAddress }) => {
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

  const key = createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET}:${clientAddress}`).digest("hex");
  const { rows } = await getDatabase().query<{ count: number }>(`
    INSERT INTO shop_request_limit (key, count, reset_at) VALUES ($1, 1, now() + interval '10 minutes')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN shop_request_limit.reset_at <= now() THEN 1 ELSE shop_request_limit.count + 1 END,
      reset_at = CASE WHEN shop_request_limit.reset_at <= now() THEN now() + interval '10 minutes' ELSE shop_request_limit.reset_at END
    RETURNING count`, [key]);
  if (rows[0].count > 10) return Response.json({ ok: false, error: "Too many reservations. Please try again later." }, { status: 429 });
  await getDatabase().query("DELETE FROM shop_request_limit WHERE reset_at < now() - interval '1 day'");

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

  if (!order.replayed) {
    const results = await Promise.allSettled([sendOrderConfirmation(order), sendNewOrderAdminAlert(order)]);
    const confirmation = results[0];
    if (confirmation.status === "fulfilled" && confirmation.value.ok) {
      try {
        await prisma.order.update({ where: { id: order.id }, data: { confirmationEmailSent: true } });
        order.confirmationEmailSent = true;
      } catch { console.error("Reservation saved; confirmation delivery status could not be recorded."); }
    }
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.ok) {
        try { await prisma.orderEvent.create({ data: { orderId: order.id, type: OrderEventType.EMAIL_SENT, message: `Email dispatched (${result.value.id}).` } }); }
        catch { console.error("Reservation saved; email event could not be recorded."); }
      }
    }
  }

  return Response.json({
    ok: true,
    orderId: order.id,
    guestToken: order.guestToken,
    emailSent: order.confirmationEmailSent,
    whatsappUrl: buildReservationWhatsappUrl(site.whatsappUrl, order),
  });
};

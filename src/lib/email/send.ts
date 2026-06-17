import { render } from "@react-email/render";

import NewOrderAdmin from "../../emails/NewOrderAdmin";
import OrderConfirmation from "../../emails/OrderConfirmation";
import OrderStatusEmail, {
  type OrderStatusVariant,
} from "../../emails/OrderStatus";
import type { OrderWithItems } from "../orders";
import {
  getAdminNotifyAddress,
  getEmailSender,
  getResend,
  getSiteUrl,
} from "./client";
import { getActiveDrop } from "../drops";

async function send(opts: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send:", opts.subject);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  const html = await render(opts.react);
  const text = await render(opts.react, { plainText: true });
  const { data, error } = await resend.emails.send({
    from: getEmailSender(),
    to: opts.to,
    subject: opts.subject,
    html,
    text,
  });
  if (error || !data?.id) {
    return {
      ok: false,
      error: error?.message ?? "Unknown Resend error",
    };
  }
  return { ok: true, id: data.id };
}

export async function sendOrderConfirmation(order: OrderWithItems) {
  const drop = await getActiveDrop();
  return send({
    to: order.email,
    subject: `Reservation ${order.id.slice(-6).toUpperCase()} — Sunset Duckies`,
    react: OrderConfirmation({
      orderId: order.id,
      guestToken: order.guestToken,
      customerName: order.name,
      items: order.items.map((i) => ({
        nameSnapshot: i.nameSnapshot,
        sku: i.sku,
        size: i.size,
        quantity: i.quantity,
        kidName: i.kidName,
      })),
      pickupMethod: order.pickupMethod,
      pickupNote: drop?.pickupNote ?? null,
      customerNote: order.customerNote,
      siteUrl: getSiteUrl(),
    }),
  });
}

export async function sendOrderStatusEmail(
  order: OrderWithItems,
  variant: OrderStatusVariant,
  adminNote?: string | null,
) {
  const subjectByVariant: Record<OrderStatusVariant, string> = {
    CONFIRMED: `Reservation locked in — ${order.id.slice(-6).toUpperCase()}`,
    READY: `Ready for pickup — Reservation ${order.id.slice(-6).toUpperCase()}`,
    FULFILLED: `Thanks for riding — Reservation ${order.id.slice(-6).toUpperCase()}`,
    CANCELLED: `Reservation cancelled — ${order.id.slice(-6).toUpperCase()}`,
  };
  return send({
    to: order.email,
    subject: subjectByVariant[variant],
    react: OrderStatusEmail({
      variant,
      orderId: order.id,
      guestToken: order.guestToken,
      customerName: order.name,
      items: order.items.map((i) => ({
        nameSnapshot: i.nameSnapshot,
        sku: i.sku,
        size: i.size,
        quantity: i.quantity,
        kidName: i.kidName,
      })),
      adminNote,
      siteUrl: getSiteUrl(),
    }),
  });
}

export async function sendNewOrderAdminAlert(order: OrderWithItems) {
  const siteUrl = getSiteUrl();
  return send({
    to: getAdminNotifyAddress(),
    subject: `[new reservation] ${order.name} — ${order.id.slice(-6).toUpperCase()}`,
    react: NewOrderAdmin({
      orderId: order.id,
      customerName: order.name,
      customerEmail: order.email,
      customerPhone: order.phone,
      items: order.items.map((i) => ({
        nameSnapshot: i.nameSnapshot,
        sku: i.sku,
        size: i.size,
        quantity: i.quantity,
        priceCentsSnapshot: i.priceCentsSnapshot,
        lineTotalCents: i.lineTotalCents,
        kidName: i.kidName,
      })),
      totalCents: order.totalCents,
      currency: order.currency,
      pickupMethod: order.pickupMethod,
      customerNote: order.customerNote,
      adminUrl: `${siteUrl}/admin/orders/${order.id}`,
    }),
  });
}

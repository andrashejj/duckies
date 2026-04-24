import { render } from "@react-email/render";

import NewOrderAdmin from "../../emails/NewOrderAdmin";
import OrderConfirmation from "../../emails/OrderConfirmation";
import type { OrderWithItems } from "../orders";
import {
  getAdminNotifyAddress,
  getEmailSender,
  getResend,
  getSiteUrl,
} from "./client";

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
  return send({
    to: order.email,
    subject: `Order ${order.id.slice(-6).toUpperCase()} — Sunset Duckies`,
    react: OrderConfirmation({
      orderId: order.id,
      guestToken: order.guestToken,
      customerName: order.name,
      items: order.items.map((i) => ({
        nameSnapshot: i.nameSnapshot,
        sku: i.sku,
        size: i.size,
        quantity: i.quantity,
        priceCentsSnapshot: i.priceCentsSnapshot,
        lineTotalCents: i.lineTotalCents,
      })),
      subtotalCents: order.subtotalCents,
      totalCents: order.totalCents,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      pickupMethod: order.pickupMethod,
      customerNote: order.customerNote,
      siteUrl: getSiteUrl(),
    }),
  });
}

export async function sendNewOrderAdminAlert(order: OrderWithItems) {
  const siteUrl = getSiteUrl();
  return send({
    to: getAdminNotifyAddress(),
    subject: `[new order] ${order.name} — ${order.id.slice(-6).toUpperCase()}`,
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
      })),
      totalCents: order.totalCents,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      pickupMethod: order.pickupMethod,
      customerNote: order.customerNote,
      adminUrl: `${siteUrl}/admin/orders/${order.id}`,
    }),
  });
}

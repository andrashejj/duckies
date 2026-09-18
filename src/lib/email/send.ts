import type { OrderWithItems } from "../orders";
import { sendMail } from "../server/email";
import { getAdminNotifyAddress, getSiteUrl } from "./client";

export type OrderStatusVariant = "CONFIRMED" | "READY" | "FULFILLED" | "CANCELLED";
type Delivery = { ok: true; id: string } | { ok: false; error: string };

async function send(to: string, subject: string, text: string): Promise<Delivery> {
  try { return { ok: true, id: await sendMail({ to, subject, text }) }; }
  catch { return { ok: false, error: "Email delivery is unavailable." }; }
}
function items(order: OrderWithItems) {
  return order.items.map(item => `${item.quantity} × ${item.nameSnapshot}${item.size ? ` (${item.size})` : ""}`).join("\n");
}
function receipt(order: OrderWithItems) {
  return `${getSiteUrl()}/orders/${order.id}?t=${order.guestToken}`;
}
export function sendOrderConfirmation(order: OrderWithItems) {
  return send(order.email, `Reservation ${order.id.slice(-6).toUpperCase()} — Sunset Duckies`,
    `Hi ${order.name},\n\nWe received your reservation:\n${items(order)}\n\nThe club will confirm availability, price, and pickup details. This is a reservation, not an online payment.\n\nTrack your reservation: ${receipt(order)}\n\nSunset Duckies`);
}
export function sendOrderStatusEmail(order: OrderWithItems, variant: OrderStatusVariant) {
  const message: Record<OrderStatusVariant, string> = {
    CONFIRMED: "Your reservation is confirmed.",
    READY: "Your reservation is ready for pickup. Please check with the club to arrange collection.",
    FULFILLED: "Your reservation has been collected. Thank you!",
    CANCELLED: "Your reservation has been cancelled. Please contact the club if you have questions.",
  };
  return send(order.email, `${message[variant]} — Sunset Duckies`,
    `Hi ${order.name},\n\n${message[variant]}\n\n${items(order)}\n\nTrack your reservation: ${receipt(order)}\n\nSunset Duckies`);
}
export function sendNewOrderAdminAlert(order: OrderWithItems): Promise<Delivery> {
  const to = getAdminNotifyAddress();
  if (!to) return Promise.resolve({ ok: false, error: "EMAIL_ADMIN_NOTIFY is not configured." });
  return send(to, `New reservation ${order.id.slice(-6).toUpperCase()} — Sunset Duckies`,
    `${order.name} placed a reservation.\n\n${items(order)}\n\nReview it: ${getSiteUrl()}/admin/orders/${order.id}`);
}
export function sendNewUploadAdminAlert(upload: { id: string; note: string | null }): Promise<Delivery> {
  const to = getAdminNotifyAddress();
  if (!to) return Promise.resolve({ ok: false, error: "EMAIL_ADMIN_NOTIFY is not configured." });
  return send(to, "New photo in the members' gallery — Sunset Duckies",
    `A club member added a photo to the gallery.${upload.note ? `\n\n"${upload.note}"` : ""}\n\nIt is live for members already; hide or remove it here if needed: ${getSiteUrl()}/admin/gallery`);
}

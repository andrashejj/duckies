import type { APIRoute } from "astro";
import { z } from "zod";

import { OrderStatus } from "../../../../../generated/prisma/client";
import { transitionOrder } from "../../../../../lib/admin-orders";

export const prerender = false;

const schema = z.object({
  to: z.enum(
    Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]],
  ),
  adminNote: z.string().trim().max(1000).optional(),
  sendEmail: z.boolean().optional(),
});

export const POST: APIRoute = async ({ locals, params, request }) => {
  const userId = locals.session?.user?.id;
  if (!userId) {
    return Response.json({ ok: false, error: "Unauthenticated." }, { status: 401 });
  }
  const orderId = params.id;
  if (!orderId) {
    return Response.json({ ok: false, error: "Missing order id." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Response.json(
      { ok: false, error: firstIssue?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  try {
    const updated = await transitionOrder({
      orderId,
      to: parsed.data.to,
      actorId: userId,
      adminNote: parsed.data.adminNote ?? null,
      sendEmail: parsed.data.sendEmail ?? true,
    });
    return Response.json({ ok: true, status: updated.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transition failed.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
};

import type { APIRoute } from "astro";
import { z } from "zod";

import { markOrderPaid } from "../../../../../lib/admin-orders";

export const prerender = false;

const schema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const POST: APIRoute = async ({ locals, params, request }) => {
  const userId = locals.session?.user?.id;
  if (!userId) {
    return Response.json({ ok: false, error: "Unauthenticated." }, { status: 401 });
  }
  const orderId = params.id;
  if (!orderId) {
    return Response.json({ ok: false, error: "Missing reservation id." }, { status: 400 });
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    // empty body is fine
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  try {
    await markOrderPaid({
      orderId,
      actorId: userId,
      note: parsed.data.note ?? null,
    });
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not mark paid.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
};

import type { APIRoute } from "astro";
import { z } from "zod";

import { addInternalNote } from "../../../../../lib/admin-orders";

export const prerender = false;

const schema = z.object({
  message: z.string().trim().min(1).max(1000),
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
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note." },
      { status: 400 },
    );
  }

  const note = await addInternalNote({
    orderId,
    actorId: userId,
    message: parsed.data.message,
  });

  return Response.json({ ok: true, id: note.id });
};

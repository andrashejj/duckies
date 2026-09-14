import type { APIRoute } from "astro";

import { dropSchema } from "../../../../lib/drop-admin";
import { prisma } from "../../../../lib/prisma";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = dropSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.drop.create({
      data: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        opensAt: parsed.data.opensAt ?? null,
        closesAt: parsed.data.closesAt ?? null,
        pickupNote: parsed.data.pickupNote ?? null,
        sortOrder: parsed.data.sortOrder,
      },
    });
    return Response.json({ ok: true, id: created.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
};

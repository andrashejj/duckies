import type { APIRoute } from "astro";

import { dropSchema } from "../../../../lib/drop-admin";
import { prisma } from "../../../../lib/prisma";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) {
    return Response.json({ ok: false, error: "Missing id." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = dropSchema.partial().safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  try {
    await prisma.drop.update({
      where: { id },
      data: {
        ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description ?? null }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.opensAt !== undefined
          ? { opensAt: parsed.data.opensAt ?? null }
          : {}),
        ...(parsed.data.closesAt !== undefined
          ? { closesAt: parsed.data.closesAt ?? null }
          : {}),
        ...(parsed.data.pickupNote !== undefined
          ? { pickupNote: parsed.data.pickupNote ?? null }
          : {}),
        ...(parsed.data.sortOrder !== undefined
          ? { sortOrder: parsed.data.sortOrder }
          : {}),
      },
    });
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) {
    return Response.json({ ok: false, error: "Missing id." }, { status: 400 });
  }
  try {
    await prisma.drop.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
};

import type { APIRoute } from "astro";

import { productSchema } from "../../../../lib/product-admin";
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

  const parsed = productSchema.partial().safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  try {
    await prisma.product.update({
      where: { id },
      data: {
        ...(parsed.data.sku !== undefined ? { sku: parsed.data.sku } : {}),
        ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.kind !== undefined ? { kind: parsed.data.kind } : {}),
        ...(parsed.data.tagline !== undefined ? { tagline: parsed.data.tagline } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.priceCents !== undefined ? { priceCents: parsed.data.priceCents } : {}),
        ...(parsed.data.currency !== undefined ? { currency: parsed.data.currency } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
        ...(parsed.data.sizes !== undefined ? { sizes: parsed.data.sizes } : {}),
        ...(parsed.data.colorway !== undefined ? { colorway: parsed.data.colorway } : {}),
        ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl ?? null } : {}),
        ...(parsed.data.imageAlt !== undefined ? { imageAlt: parsed.data.imageAlt ?? null } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        ...(parsed.data.featured !== undefined ? { featured: parsed.data.featured } : {}),
        ...(parsed.data.stock !== undefined ? { stock: parsed.data.stock ?? null } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
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
    await prisma.product.update({
      where: { id },
      data: { active: false },
    });
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Archive failed.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
};

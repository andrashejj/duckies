import type { APIRoute } from "astro";

import { productSchema } from "../../../../lib/product-admin";
import { prisma } from "../../../../lib/prisma";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return Response.json(
      { ok: false, error: first?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.product.create({
      data: {
        sku: parsed.data.sku,
        slug: parsed.data.slug,
        name: parsed.data.name,
        kind: parsed.data.kind,
        tagline: parsed.data.tagline ?? null,
        description: parsed.data.description,
        priceCents: parsed.data.priceCents,
        currency: parsed.data.currency,
        category: parsed.data.category,
        sizes: parsed.data.sizes,
        colorway: parsed.data.colorway,
        active: parsed.data.active,
        featured: parsed.data.featured,
        stock: parsed.data.stock ?? null,
        sortOrder: parsed.data.sortOrder,
      },
    });
    return Response.json({ ok: true, id: created.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
};

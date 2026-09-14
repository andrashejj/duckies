import { shop } from "../src/data/shop";
import { createPrismaClient } from "../src/lib/prisma-factory";
import { getDatabase } from "../src/lib/server/db";

const prisma = createPrismaClient();
try {
  const drop = await prisma.drop.upsert({
    where: { slug: "drop-001" }, update: {},
    create: { slug: "drop-001", name: "Drop 001 — Founding kit", status: "DRAFT",
      description: "The original kit concepts. Review prices, sizes, and availability before publishing.",
      pickupNote: "Pickup at Monday or Friday sessions in Tamarin, arranged with the club." },
  });
  for (const [index, product] of shop.products.entries()) {
    const sizes = product.kind === "Headwear" ? ["Kids", "Adult"] : [
      ...(product.sizes.toLowerCase().includes("kid") ? ["Kids 4", "Kids 6", "Kids 8", "Kids 10", "Kids 12", "Kids 14"] : []),
      ...(product.sizes.toLowerCase().includes("adult") ? ["Adult XS", "Adult S", "Adult M", "Adult L", "Adult XL", "Adult XXL"] : []),
    ];
    await prisma.product.upsert({
      where: { slug: product.id }, update: {},
      create: { slug: product.id, sku: product.id.toUpperCase(), name: product.name,
        kind: product.kind, tagline: product.tagline, description: product.description,
        priceCents: product.price * 100, currency: "MUR", sizes, colorway: product.color,
        imageUrl: product.image, imageAlt: product.imageAlt, active: drop.status === "DRAFT",
        featured: Boolean(product.featured), sortOrder: index, dropId: drop.id,
        category: product.kind === "Headwear" ? "HEADWEAR" : product.kind === "Founding bundle" ? "BUNDLE" : "APPAREL" },
    });
  }
  console.log("Missing founding-kit concepts added as drafts. Existing products and drops were left unchanged.");
} finally { await prisma.$disconnect(); await getDatabase().end(); }

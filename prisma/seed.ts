import { shop } from "../src/data/shop";
import { createPrismaClient } from "../src/lib/prisma-factory";
import { getDatabase } from "../src/lib/server/db";

// Seeds the granola drop as drafts for organiser review. Re-running adds what
// is missing and leaves existing drops and products alone, except that the
// founding-kit concepts the shop started with are taken off the rack.
const foundingKit = ["tee-cream", "tee-black", "tee-surf-club", "longsleeve-teal", "hoodie-black", "bucket-hat", "cap", "duckies-kit"];

const prisma = createPrismaClient();
try {
  const drop = await prisma.drop.upsert({
    where: { slug: "granola-001" }, update: {},
    create: { slug: "granola-001", name: "Drop 001 — Granola", status: "DRAFT",
      description: "Three flavours, baked in Tamarin in small batches. Review prices and stock, then set the drop live.",
      pickupNote: "Pickup at Monday or Friday sessions in Tamarin, arranged with the club." },
  });
  for (const [index, product] of shop.products.entries()) {
    await prisma.product.upsert({
      where: { slug: product.id }, update: {},
      create: { slug: product.id, sku: `GRANOLA-${product.id.toUpperCase()}`, name: product.name,
        kind: product.kind, tagline: product.tagline, description: product.description,
        priceCents: product.price * 100, currency: "MUR", sizes: [`${product.grams} g`], colorway: product.color,
        imageUrl: null, imageAlt: product.imageAlt, active: drop.status === "DRAFT",
        featured: Boolean(product.featured), sortOrder: index, dropId: drop.id, category: "GRANOLA" },
    });
  }
  const retired = await prisma.product.updateMany({ where: { slug: { in: foundingKit }, active: true }, data: { active: false } });
  await prisma.drop.updateMany({ where: { slug: "drop-001", status: { not: "CLOSED" } }, data: { status: "CLOSED" } });
  console.log(`Missing granola flavours added as drafts. Existing products and drops were left unchanged${retired.count ? `; ${retired.count} founding-kit concept(s) taken off the rack` : ""}.`);
} finally { await prisma.$disconnect(); await getDatabase().end(); }

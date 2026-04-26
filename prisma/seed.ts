import "dotenv/config";

import { site } from "../src/data/site";
import { DropStatus, ProductCategory } from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/lib/prisma-factory";

const prisma = createPrismaClient();

const categoryBySourceKind: Record<string, ProductCategory> = {
  "Founding bundle": ProductCategory.BUNDLE,
  Tee: ProductCategory.APPAREL,
  "Long sleeve": ProductCategory.APPAREL,
  Hoodie: ProductCategory.APPAREL,
  Headwear: ProductCategory.HEADWEAR,
  Accessories: ProductCategory.ACCESSORIES,
  Stickers: ProductCategory.STATIONERY,
  Paper: ProductCategory.STATIONERY,
  Bag: ProductCategory.ACCESSORIES,
  Hydration: ProductCategory.ACCESSORIES,
  Board: ProductCategory.BOARD_CARE,
};

type SourceProduct = (typeof site.shop.products)[number] & {
  image?: string;
  imageAlt?: string;
};

async function main() {
  const drop = await prisma.drop.upsert({
    where: { slug: "drop-001" },
    update: {
      name: "Drop 001 — Founding kit",
      description:
        "First wave of Sunset Duckies kit: tees, hoodies, and the matte-black founding bundle. Made-to-order, picked up at sesh.",
      status: DropStatus.LIVE,
      pickupNote: "Pickup at next Wed/Fri sesh in Tamarin.",
      sortOrder: 0,
    },
    create: {
      slug: "drop-001",
      name: "Drop 001 — Founding kit",
      description:
        "First wave of Sunset Duckies kit: tees, hoodies, and the matte-black founding bundle. Made-to-order, picked up at sesh.",
      status: DropStatus.LIVE,
      pickupNote: "Pickup at next Wed/Fri sesh in Tamarin.",
      sortOrder: 0,
    },
  });

  const products = site.shop.products as SourceProduct[];
  const sourceSlugs = new Set(products.map((p) => p.id));

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const category = categoryBySourceKind[p.kind] ?? ProductCategory.ACCESSORIES;
    const priceCents = p.price * 100;
    const data = {
      sku: p.id.toUpperCase(),
      name: p.name,
      kind: p.kind,
      tagline: p.tagline,
      description: p.description,
      priceCents,
      currency: "MUR",
      category,
      sizes: [p.sizes],
      colorway: p.color,
      imageUrl: p.image ?? null,
      imageAlt: p.imageAlt ?? null,
      active: true,
      featured: Boolean(p.featured),
      sortOrder: i,
      dropId: drop.id,
    };

    await prisma.product.upsert({
      where: { slug: p.id },
      update: data,
      create: { ...data, slug: p.id },
    });
  }

  if (sourceSlugs.size > 0) {
    const archived = await prisma.product.updateMany({
      where: { slug: { notIn: Array.from(sourceSlugs) }, active: true },
      data: { active: false },
    });
    if (archived.count > 0) {
      console.log(`Archived ${archived.count} products no longer in site.ts.`);
    }
  }

  console.log(`Seeded drop "${drop.name}" with ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

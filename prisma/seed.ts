import { PrismaClient, ProductCategory } from "@prisma/client";

import { site } from "../src/data/site";

const prisma = new PrismaClient();

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

async function main() {
  const products = site.shop.products;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const category = categoryBySourceKind[p.kind] ?? ProductCategory.ACCESSORIES;
    const priceCents = p.price * 100;

    await prisma.product.upsert({
      where: { slug: p.id },
      update: {
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
        active: true,
        featured: Boolean(p.featured),
        sortOrder: i,
      },
      create: {
        sku: p.id.toUpperCase(),
        slug: p.id,
        name: p.name,
        kind: p.kind,
        tagline: p.tagline,
        description: p.description,
        priceCents,
        currency: "MUR",
        category,
        sizes: [p.sizes],
        colorway: p.color,
        active: true,
        featured: Boolean(p.featured),
        sortOrder: i,
      },
    });
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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

type SourceProduct = (typeof site.shop.products)[number] & {
  image?: string;
  imageAlt?: string;
};

async function main() {
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
    };

    await prisma.product.upsert({
      where: { slug: p.id },
      update: data,
      create: { ...data, slug: p.id },
    });
  }

  // Soft-archive any DB rows that aren't in the source any more, so dev DBs
  // stay aligned with the brand kit. Production catalog is managed via /admin.
  if (sourceSlugs.size > 0) {
    const archived = await prisma.product.updateMany({
      where: { slug: { notIn: Array.from(sourceSlugs) }, active: true },
      data: { active: false },
    });
    if (archived.count > 0) {
      console.log(`Archived ${archived.count} products no longer in site.ts.`);
    }
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

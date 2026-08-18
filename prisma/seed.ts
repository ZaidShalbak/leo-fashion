// Seeds ~15 sample products across 3 collections, each with multiple
// size/color variants, plus one admin user for local login.
//
// Run with `npm run db:seed` (wraps `tsx prisma/seed.ts`).
//
// NOTE on the admin user's supabaseId: User.supabaseId links this row to a
// real Supabase Auth user (auth.users.id). Until real Supabase credentials
// are in .env, there's no real auth backend to sign up against, so this
// script seeds a placeholder supabaseId. Once real Supabase credentials are
// added, sign up with the same email through Supabase Auth and update this
// row's supabaseId to match the real auth.users.id it creates (or wire a
// post-signup hook to do it automatically) — see CLAUDE.md.
import "dotenv/config";
import { PrismaClient, ProductStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter — see src/server/db.ts for the same
// pattern used at app runtime.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const ADMIN_EMAIL = "admin@clothing-store.test";
const ADMIN_PLACEHOLDER_SUPABASE_ID = "00000000-0000-0000-0000-000000000001";

type SeedVariant = {
  size: string;
  color: string;
  skuSuffix: string;
  inventoryQuantity: number;
  priceOverrideCents?: number;
};

type SeedProduct = {
  title: string;
  slug: string;
  description: string;
  basePriceCents: number;
  skuPrefix: string;
  variants: SeedVariant[];
};

const SIZES = ["XS", "S", "M", "L", "XL"];

function sizeRun(colors: string[], startInventory = 12): SeedVariant[] {
  const variants: SeedVariant[] = [];
  for (const size of SIZES) {
    for (const color of colors) {
      variants.push({
        size,
        color,
        skuSuffix: `${size}-${color.slice(0, 3).toUpperCase()}`,
        inventoryQuantity: startInventory,
      });
    }
  }
  return variants;
}

const COLLECTIONS: {
  title: string;
  handle: string;
  description: string;
  products: SeedProduct[];
}[] = [
  {
    title: "Everyday Essentials",
    handle: "everyday-essentials",
    description: "Wardrobe staples built to wear on repeat.",
    products: [
      {
        title: "Classic Crew Tee",
        slug: "classic-crew-tee",
        description: "A soft, midweight cotton tee in a relaxed fit.",
        basePriceCents: 2800,
        skuPrefix: "TEE-CRW",
        variants: sizeRun(["Black", "White", "Heather Grey"]),
      },
      {
        title: "Everyday Hoodie",
        slug: "everyday-hoodie",
        description: "A pullover fleece hoodie with a kangaroo pocket.",
        basePriceCents: 5800,
        skuPrefix: "HOOD-EVR",
        variants: sizeRun(["Black", "Navy", "Sand"]),
      },
      {
        title: "Straight Leg Denim",
        slug: "straight-leg-denim",
        description: "Mid-rise straight leg jeans in rigid denim.",
        basePriceCents: 7200,
        skuPrefix: "DNM-STR",
        variants: sizeRun(["Indigo", "Black"]),
      },
      {
        title: "Ribbed Tank",
        slug: "ribbed-tank",
        description: "A stretchy ribbed-knit tank for layering.",
        basePriceCents: 2200,
        skuPrefix: "TNK-RIB",
        variants: sizeRun(["Black", "White", "Olive"]),
      },
      {
        title: "Relaxed Sweatpants",
        slug: "relaxed-sweatpants",
        description: "Brushed-back fleece joggers with a drawstring waist.",
        basePriceCents: 4800,
        skuPrefix: "SWT-RLX",
        variants: sizeRun(["Grey", "Black"]),
      },
    ],
  },
  {
    title: "Outerwear",
    handle: "outerwear",
    description: "Jackets and coats for every season.",
    products: [
      {
        title: "Packable Rain Jacket",
        slug: "packable-rain-jacket",
        description: "A lightweight, water-resistant shell that packs into its own pocket.",
        basePriceCents: 9800,
        skuPrefix: "JKT-RAIN",
        variants: sizeRun(["Black", "Forest Green"]),
      },
      {
        title: "Wool Blend Overcoat",
        slug: "wool-blend-overcoat",
        description: "A tailored knee-length coat in a wool-blend twill.",
        basePriceCents: 18800,
        skuPrefix: "CT-WOOL",
        variants: sizeRun(["Camel", "Charcoal"], 6),
      },
      {
        title: "Quilted Vest",
        slug: "quilted-vest",
        description: "An insulated vest for layering in cooler weather.",
        basePriceCents: 6800,
        skuPrefix: "VST-QLT",
        variants: sizeRun(["Black", "Olive"]),
      },
      {
        title: "Denim Trucker Jacket",
        slug: "denim-trucker-jacket",
        description: "A classic boxy trucker jacket in rigid denim.",
        basePriceCents: 8200,
        skuPrefix: "JKT-TRK",
        variants: sizeRun(["Indigo", "Black"]),
      },
      {
        title: "Windbreaker",
        slug: "windbreaker",
        description: "A full-zip windbreaker with a mesh lining.",
        basePriceCents: 6200,
        skuPrefix: "JKT-WIND",
        variants: sizeRun(["Black", "Red", "Navy"]),
      },
    ],
  },
  {
    title: "Weekend",
    handle: "weekend",
    description: "Easy pieces for time off the clock.",
    products: [
      {
        title: "Cotton Poplin Shirt",
        slug: "cotton-poplin-shirt",
        description: "A relaxed button-up in crisp cotton poplin.",
        basePriceCents: 5400,
        skuPrefix: "SHT-POP",
        variants: sizeRun(["White", "Light Blue", "Sage"]),
      },
      {
        title: "Linen Blend Shorts",
        slug: "linen-blend-shorts",
        description: "Breathable drawstring shorts in a linen-cotton blend.",
        basePriceCents: 3800,
        skuPrefix: "SHRT-LIN",
        variants: sizeRun(["Khaki", "Navy", "White"]),
      },
      {
        title: "Oversized Flannel",
        slug: "oversized-flannel",
        description: "A boxy, brushed-cotton flannel shirt.",
        basePriceCents: 4800,
        skuPrefix: "SHT-FLN",
        variants: sizeRun(["Red Plaid", "Green Plaid"]),
      },
      {
        title: "Terry Polo",
        slug: "terry-polo",
        description: "A toweling-terry polo with a ribbed collar.",
        basePriceCents: 4200,
        skuPrefix: "PLO-TRY",
        variants: sizeRun(["Cream", "Black"]),
      },
      {
        title: "Canvas Overshirt",
        slug: "canvas-overshirt",
        description: "A heavyweight cotton canvas shirt jacket.",
        basePriceCents: 6800,
        skuPrefix: "SHT-CNV",
        variants: sizeRun(["Stone", "Black"]),
      },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  // Wipe existing data (dev-only script) in FK-safe order.
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.productCollection.deleteMany();
  await db.productVariant.deleteMany();
  await db.product.deleteMany();
  await db.collection.deleteMany();
  await db.address.deleteMany();
  await db.user.deleteMany();

  const admin = await db.user.create({
    data: {
      supabaseId: ADMIN_PLACEHOLDER_SUPABASE_ID,
      email: ADMIN_EMAIL,
      name: "Store Admin",
      role: "admin",
    },
  });
  console.log(`Created admin user: ${admin.email} (role=${admin.role})`);

  let productCount = 0;

  for (const collectionSeed of COLLECTIONS) {
    const collection = await db.collection.create({
      data: {
        title: collectionSeed.title,
        handle: collectionSeed.handle,
        description: collectionSeed.description,
      },
    });

    for (const productSeed of collectionSeed.products) {
      const product = await db.product.create({
        data: {
          title: productSeed.title,
          slug: productSeed.slug,
          description: productSeed.description,
          basePriceCents: productSeed.basePriceCents,
          status: ProductStatus.active,
          collections: {
            create: { collectionId: collection.id },
          },
          variants: {
            create: productSeed.variants.map((variant) => ({
              sku: `${productSeed.skuPrefix}-${variant.skuSuffix}`,
              size: variant.size,
              color: variant.color,
              inventoryQuantity: variant.inventoryQuantity,
              priceOverrideCents: variant.priceOverrideCents,
            })),
          },
          // Placeholder gallery images — two generic, collection-tinted
          // SVGs under /public/products. Swap for real Supabase Storage
          // URLs once real product photography exists; nothing else about
          // ProductImage needs to change.
          images: {
            create: [
              {
                url: `/products/${collectionSeed.handle}-1.svg`,
                altText: `${productSeed.title} — front`,
                position: 0,
              },
              {
                url: `/products/${collectionSeed.handle}-2.svg`,
                altText: `${productSeed.title} — detail`,
                position: 1,
              },
            ],
          },
        },
      });
      productCount += 1;
      console.log(`  + ${product.title} (${collectionSeed.title})`);
    }
  }

  console.log(
    `Done. Seeded ${productCount} products across ${COLLECTIONS.length} collections.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

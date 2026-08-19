// One-off script — NOT part of the seed script, and safe to run against the
// real Supabase database (it only creates Brand rows and assigns brandId to
// products that don't have one yet; it never deletes or touches anything
// else). Needed because the seed script wipes all data on every run (see
// its own comments) and re-running it against a database with real
// orders/accounts would destroy them.
//
// Run from a machine with real network access to Supabase (this sandbox
// doesn't have one — see CLAUDE.md section 6):
//
//   npx tsx prisma/backfill-brands.ts
//
// What it does:
//   1. Creates the 5 brands below if they don't already exist (matched by
//      slug, so running this twice is harmless).
//   2. For every Product with brandId still null, assigns a brand — by
//      matching the product's title against the same seed list this
//      script defines, falling back to "Leo Fashion" (the house brand) for
//      anything it doesn't recognize (e.g. a real product an admin added
//      after Phase 4 through the dashboard, which never had a seed entry).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const BRANDS = [
  {
    name: "Leo Fashion",
    slug: "leo-fashion",
    logoUrl: "/brands/leo-fashion.svg",
    description: "Our in-house line of everyday staples.",
  },
  {
    name: "Northline Apparel",
    slug: "northline-apparel",
    logoUrl: "/brands/northline-apparel.svg",
    description: "Cozy fleece and knitwear from a Pacific Northwest studio.",
  },
  {
    name: "Rivermark Denim",
    slug: "rivermark-denim",
    logoUrl: "/brands/rivermark-denim.svg",
    description: "Rigid and washed denim, made to break in.",
  },
  {
    name: "Solstice Outerwear",
    slug: "solstice-outerwear",
    logoUrl: "/brands/solstice-outerwear.svg",
    description: "Technical shells and coats for every season.",
  },
  {
    name: "Harbor & Co.",
    slug: "harbor-co",
    logoUrl: "/brands/harbor-co.svg",
    description: "Relaxed, easy-wearing pieces for the weekend.",
  },
];

// Same mapping seed.ts uses for the original 15 sample products.
const TITLE_TO_BRAND_SLUG: Record<string, string> = {
  "Classic Crew Tee": "leo-fashion",
  "Ribbed Tank": "leo-fashion",
  "Terry Polo": "leo-fashion",
  "Everyday Hoodie": "northline-apparel",
  "Relaxed Sweatpants": "northline-apparel",
  "Oversized Flannel": "northline-apparel",
  "Straight Leg Denim": "rivermark-denim",
  "Denim Trucker Jacket": "rivermark-denim",
  "Packable Rain Jacket": "solstice-outerwear",
  "Wool Blend Overcoat": "solstice-outerwear",
  "Quilted Vest": "solstice-outerwear",
  Windbreaker: "solstice-outerwear",
  "Cotton Poplin Shirt": "harbor-co",
  "Linen Blend Shorts": "harbor-co",
  "Canvas Overshirt": "harbor-co",
};
const FALLBACK_BRAND_SLUG = "leo-fashion";

async function main() {
  const brandIdBySlug = new Map<string, string>();
  for (const brandSeed of BRANDS) {
    const brand = await db.brand.upsert({
      where: { slug: brandSeed.slug },
      update: {},
      create: brandSeed,
    });
    brandIdBySlug.set(brand.slug, brand.id);
  }
  console.log(`${BRANDS.length} brands ready.`);

  const unassigned = await db.product.findMany({ where: { brandId: null } });
  if (unassigned.length === 0) {
    console.log("No products need a brand backfilled.");
    await db.$disconnect();
    return;
  }

  let assigned = 0;
  for (const product of unassigned) {
    const slug = TITLE_TO_BRAND_SLUG[product.title] ?? FALLBACK_BRAND_SLUG;
    const brandId = brandIdBySlug.get(slug)!;
    await db.product.update({ where: { id: product.id }, data: { brandId } });
    console.log(`  ${product.title} -> ${slug}`);
    assigned += 1;
  }
  console.log(`Backfilled ${assigned} product(s).`);

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

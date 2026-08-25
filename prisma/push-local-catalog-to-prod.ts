// One-off script — copies the full catalog (brands, categories, products +
// variants + images, delivery zones, discount codes, sales, hero banners)
// from local dev Postgres to the real production database, treating local
// as authoritative: every one of these tables is fully wiped on the prod
// side and replaced with an exact copy of local's rows (same ids, so
// relations stay intact across the copy — e.g. a Product's brandId still
// points at the right Brand after both are copied). Users/Addresses/
// Orders/Carts/AuditLog are never touched — this only replaces
// merchandising/catalog data.
//
// Side effect worth knowing before running: wiping Product also empties
// CartItem rows that reference it (that FK has no cascade — see
// schema.prisma — so it has to be cleared first or the product delete
// fails). That means any real customer's in-progress cart on production
// gets cleared. Past Orders are unaffected either way — OrderItem keeps a
// full snapshot and its productId/variantId/discountCodeId/deliveryZoneId
// links are all onDelete: SetNull, never Cascade.
//
// This only copies database rows, not files — if any local ProductImage.url
// points at a local static path (e.g. "/products/foo.jpg") rather than a
// Supabase Storage URL, commit and deploy that file under public/products/
// first or it'll 404 on production after this runs.
//
// Needs real network access to the production database, which this
// sandbox does not have (see CLAUDE.md section 6) — run this from your own
// machine's terminal. Two connection strings are required:
//   - DATABASE_URL: your normal local .env value, read automatically (the
//     source — local dev Postgres, where the real catalog data lives)
//   - PROD_DIRECT_URL: the real Supabase project's *direct* (non-pooled)
//     connection string (the target) — add it to .env temporarily, the
//     same way every other real secret in this file already is
//
// Defaults to a dry run (prints row counts on both sides, writes nothing):
//
//   npx tsx prisma/push-local-catalog-to-prod.ts
//
// Before running for real, make sure prod's schema is current:
//
//   npx prisma migrate deploy
//
// Then actually wipe + copy:
//
//   npx tsx prisma/push-local-catalog-to-prod.ts --apply
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function assertRealProdUrl(url: string | undefined): asserts url is string {
  if (!url || url.includes("localhost") || url.includes("127.0.0.1")) {
    console.error(
      "PROD_DIRECT_URL is missing or looks like a local connection string. Set it to your real " +
        "Supabase project's direct connection string (Project Settings -> Database) before running this."
    );
    process.exit(1);
  }
}

async function main() {
  const apply = process.argv.includes("--apply");

  const localUrl = process.env.DATABASE_URL;
  if (!localUrl) {
    console.error("DATABASE_URL (local) is not set.");
    process.exit(1);
  }

  const prodUrl = process.env.PROD_DIRECT_URL;
  const hasProd = Boolean(prodUrl);
  if (hasProd) assertRealProdUrl(prodUrl);
  if (apply && !hasProd) {
    console.error("PROD_DIRECT_URL must be set to run with --apply.");
    process.exit(1);
  }

  const local = new PrismaClient({ adapter: new PrismaPg({ connectionString: localUrl }) });
  const prod = hasProd
    ? new PrismaClient({ adapter: new PrismaPg({ connectionString: prodUrl }) })
    : null;

  const [
    brands,
    collections,
    products,
    variants,
    images,
    productCollections,
    deliveryZones,
    discountCodes,
    sales,
    heroBanners,
  ] = await Promise.all([
    local.brand.findMany(),
    local.collection.findMany(),
    local.product.findMany(),
    local.productVariant.findMany(),
    local.productImage.findMany(),
    local.productCollection.findMany(),
    local.deliveryZone.findMany(),
    local.discountCode.findMany(),
    local.sale.findMany(),
    local.heroBanner.findMany(),
  ]);

  console.log("Local catalog (source):");
  console.log(`  Brands: ${brands.length}`);
  console.log(`  Categories: ${collections.length}`);
  console.log(`  Products: ${products.length}`);
  console.log(`  Variants: ${variants.length}`);
  console.log(`  Images: ${images.length}`);
  console.log(`  Delivery zones: ${deliveryZones.length}`);
  console.log(`  Discount codes: ${discountCodes.length}`);
  console.log(`  Sales: ${sales.length}`);
  console.log(`  Hero banners: ${heroBanners.length}`);

  const localStaticImages = images.filter((image) => image.url.startsWith("/"));
  if (localStaticImages.length > 0) {
    console.log(
      `\n${localStaticImages.length} image(s) reference local static paths (e.g. ` +
        `"${localStaticImages[0].url}") rather than a Supabase Storage URL — make sure the ` +
        "matching files under public/products/ are committed and deployed, or they'll 404 on production."
    );
  }

  if (hasProd && prod) {
    const [prodBrands, prodCollections, prodProducts, prodZones, prodCodes, prodSales, prodBanners] =
      await Promise.all([
        prod.brand.count(),
        prod.collection.count(),
        prod.product.count(),
        prod.deliveryZone.count(),
        prod.discountCode.count(),
        prod.sale.count(),
        prod.heroBanner.count(),
      ]);
    console.log("\nCurrent production (will be replaced):");
    console.log(`  Brands: ${prodBrands}`);
    console.log(`  Categories: ${prodCollections}`);
    console.log(`  Products: ${prodProducts}`);
    console.log(`  Delivery zones: ${prodZones}`);
    console.log(`  Discount codes: ${prodCodes}`);
    console.log(`  Sales: ${prodSales}`);
    console.log(`  Hero banners: ${prodBanners}`);
  } else {
    console.log(
      "\nPROD_DIRECT_URL not set — skipping the production-side comparison. Set it to see what " +
        "would be replaced, and to actually run --apply."
    );
  }

  if (!apply || !prod) {
    console.log("\nDry run only — no changes made. Re-run with --apply to wipe and replace production.");
    await local.$disconnect();
    await prod?.$disconnect();
    return;
  }

  console.log("\nApplying — wiping production catalog tables...");

  // CartItem has no cascade from Product/ProductVariant (RESTRICT), so it
  // has to go first or the product delete below fails. Everything else
  // here cascades automatically per schema.prisma (ProductVariant/
  // ProductImage/ProductCollection from Product; Sale from Brand/
  // Collection) — no need to delete those explicitly.
  await prod.cartItem.deleteMany();
  await prod.product.deleteMany();
  await prod.sale.deleteMany();
  await prod.brand.deleteMany();
  await prod.collection.deleteMany();
  await prod.deliveryZone.deleteMany();
  await prod.discountCode.deleteMany();
  await prod.heroBanner.deleteMany();

  console.log("Recreating from local...");

  // Parents before children so foreign keys resolve: Brand/Collection
  // before Product, Product before its Variants/Images/ProductCollection
  // joins, Collection/Brand before Sale.
  for (const brand of brands) await prod.brand.create({ data: brand });
  for (const collection of collections) await prod.collection.create({ data: collection });
  for (const product of products) await prod.product.create({ data: product });
  if (variants.length) await prod.productVariant.createMany({ data: variants });
  if (images.length) await prod.productImage.createMany({ data: images });
  if (productCollections.length)
    await prod.productCollection.createMany({ data: productCollections });
  for (const zone of deliveryZones) await prod.deliveryZone.create({ data: zone });
  for (const code of discountCodes) await prod.discountCode.create({ data: code });
  for (const sale of sales) await prod.sale.create({ data: sale });
  for (const banner of heroBanners) await prod.heroBanner.create({ data: banner });

  console.log("Done. Production catalog now matches local.");

  await local.$disconnect();
  await prod.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// One-off script — NOT part of the seed script, and safe to run against the
// real Supabase database (it only upserts these 4 Brand rows by slug; it
// never deletes or touches anything else, including products). Run from a
// machine with real network access to Supabase (this sandbox doesn't have
// one — see CLAUDE.md section 6):
//
//   npx tsx prisma/add-real-brands.ts
//
// Logo URLs point at Wikimedia Commons file pages via the built-in
// Special:FilePath redirect (https://www.mediawiki.org/wiki/Manual:Special:FilePath),
// which is the standard way to hotlink a Commons file's current image —
// freely licensed, no API key, no scraping. next/image renders these with
// the `unoptimized` prop (see BrandsSection.tsx / brands/page.tsx), which is
// required for any logo host that isn't in next.config.ts's remotePatterns —
// admin-entered logo URLs can be any domain, so that prop is what makes an
// arbitrary host like this work at all. If Wikimedia ever renames/removes
// one of these files, swap the URL from the admin UI (/admin/brands) —
// no re-run of this script needed for that.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const BRANDS = [
  {
    name: "Jack & Jones",
    slug: "jack-jones",
    logoUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Jack_%26_Jones_logo.svg",
  },
  {
    name: "Wrangler",
    slug: "wrangler",
    logoUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Wrangler_%28Jeans%29_logo.svg",
  },
  {
    name: "American Eagle",
    slug: "american-eagle",
    logoUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/American_Eagle_Outfitters_text_logo.svg",
  },
  {
    name: "Lee",
    slug: "lee",
    logoUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Lee_logo.svg",
  },
];

async function main() {
  for (const brandSeed of BRANDS) {
    const brand = await db.brand.upsert({
      where: { slug: brandSeed.slug },
      update: {},
      create: brandSeed,
    });
    console.log(`  ${brand.name} (${brand.slug}) ready — id ${brand.id}`);
  }
  console.log(`${BRANDS.length} brand(s) ready.`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

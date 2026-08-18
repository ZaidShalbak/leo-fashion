// One-off script — NOT part of the seed script, and safe to run against a
// database that already has real data (orders, accounts, etc). It only
// touches the single seeded admin row.
//
// Phase 1's seed script created an admin User row with a placeholder
// supabaseId, because real Supabase Auth didn't exist yet at the time (see
// CLAUDE.md section 7, Phase 3 notes). This script gives that row a real
// Supabase Auth identity so it can actually sign in, without touching
// anything else in the database (no re-seed, no data loss).
//
// Run from a machine with real network access to Supabase (this sandbox
// doesn't have one — see CLAUDE.md section 6):
//
//   npx tsx prisma/fix-admin-auth.ts [password]
//
// If you don't pass a password, one is generated and printed — copy it
// down, it's not stored anywhere else.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = "admin@clothing-store.test";

function assertRealSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (url.includes("localhost") || key.includes("placeholder")) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env still look like the local " +
        "placeholder values. This script needs to run against your real Supabase project — check " +
        ".env has the real values before running it."
    );
    process.exit(1);
  }
}

async function main() {
  assertRealSupabaseEnv();

  const password = process.argv[2] ?? randomBytes(9).toString("base64url");

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  const existingRow = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existingRow) {
    console.error(
      `No User row found for ${ADMIN_EMAIL} — has the database been seeded? Nothing to fix.`
    );
    process.exit(1);
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password,
    email_confirm: true,
    user_metadata: { name: "Store Admin" },
  });

  if (createError || !created.user) {
    console.error(
      `Couldn't create the Supabase Auth user (maybe it already exists?): ${createError?.message}`
    );
    console.error(
      "If it already exists, find its id in Supabase → Authentication → Users, then run:\n" +
        `  UPDATE "User" SET "supabaseId" = '<that id>' WHERE email = '${ADMIN_EMAIL}';\n` +
        "via Prisma Studio or the SQL editor instead of this script."
    );
    process.exit(1);
  }

  await db.user.update({
    where: { email: ADMIN_EMAIL },
    data: { supabaseId: created.user.id },
  });

  console.log(`Done. ${ADMIN_EMAIL} can now sign in at /login with:`);
  console.log(`  password: ${password}`);

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

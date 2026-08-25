// One-off script — directly sets a Supabase Auth user's password via the
// admin API, bypassing the email reset-link flow entirely. The app has no
// reset-password confirmation page to consume that link's recovery token
// (no route calls `updateUser` with a new password), so a dashboard/email
// "reset password" request alone never actually changes anything — this is
// the reliable way to actually set one. Safe to run against a database with
// real data; it only touches the one Supabase Auth user for the email given.
//
// Run from a machine with real network access to Supabase (this sandbox
// doesn't have one — see CLAUDE.md section 6):
//
//   npx tsx prisma/reset-user-password.ts <email> <new-password>
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npx tsx prisma/reset-user-password.ts <email> <new-password>");
    process.exit(1);
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  const existingRow = await db.user.findUnique({ where: { email } });
  if (!existingRow) {
    console.error(`No User row found for ${email}.`);
    process.exit(1);
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(existingRow.supabaseId, {
    password,
  });

  if (error) {
    console.error(`Couldn't update the password: ${error.message}`);
    process.exit(1);
  }

  console.log(`Done. ${email} can now sign in at /login with the password you provided.`);

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

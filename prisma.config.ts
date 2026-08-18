import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npx prisma migrate dev` runs this after applying migrations.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations run against the direct (non-pooled) connection — this
    // matters once DATABASE_URL points at a connection pooler (e.g.
    // Supabase's PgBouncer) in production. Locally DATABASE_URL and
    // DIRECT_URL point at the same database. Runtime queries (src/server/db.ts)
    // use DATABASE_URL independently via the driver adapter.
    url: env("DIRECT_URL"),
  },
});

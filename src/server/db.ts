import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter for every database — there's no more
// standalone `new PrismaClient()` that reads a schema-level datasource url.
// Runtime queries go through DATABASE_URL (which may be a pooled Supabase
// PgBouncer connection in production); migrations use DIRECT_URL instead,
// configured separately in prisma.config.ts.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Prisma client singleton — reused across hot reloads in dev so we don't
// exhaust Postgres connections. Import `db` from here everywhere; never
// instantiate PrismaClient directly elsewhere.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

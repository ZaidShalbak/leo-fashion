import "server-only";
import { PrismaClient } from "@prisma/client";

// Prisma client singleton — reused across hot reloads in dev so we don't
// exhaust Postgres connections. Import `db` from here everywhere; never
// instantiate PrismaClient directly elsewhere.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

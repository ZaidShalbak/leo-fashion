"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import { brandSchema, type BrandInput } from "@/lib/validators/brand";

export type ActionResult = { success: true } | { success: false; error: string };

/** Minimal brand management — list lives on the page itself; this only creates. */
export async function createBrand(input: BrandInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid brand." };
  }
  const { logoUrl, ...fields } = parsed.data;

  let brand: { id: string };
  try {
    brand = await db.brand.create({
      data: { ...fields, logoUrl: logoUrl || undefined },
    });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "brand.create",
    targetType: "Brand",
    targetId: brand.id,
    metadata: { name: fields.name },
  });

  revalidatePath("/admin/brands");
  return { success: true };
}

function friendlyDbError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Prisma.PrismaClientKnownRequestError).code
  ) {
    const code = (error as Prisma.PrismaClientKnownRequestError).code;
    if (code === "P2002") return "A brand with that slug already exists.";
  }
  throw error;
}

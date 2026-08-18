import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

import { db } from "./db";

/**
 * Writes one AuditLog row. Not itself a server action (no "use server") —
 * it's an internal helper called from admin server actions after (or as
 * part of) their actual mutation. Accepts an optional `tx` so callers that
 * wrap the mutation in db.$transaction can log atomically with it.
 */
export async function logAudit(
  params: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Prisma.InputJsonValue;
  },
  tx: Pick<PrismaClient, "auditLog"> = db
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata,
    },
  });
}

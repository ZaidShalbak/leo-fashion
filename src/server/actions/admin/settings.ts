"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import { STORE_SETTINGS_ID } from "@/server/settings";
import {
  storeSettingsUpdateSchema,
  type StoreSettingsUpdateInput,
} from "@/lib/validators/settings";

export type ActionResult = { success: true } | { success: false; error: string };

export async function updateStoreSettings(input: StoreSettingsUpdateInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = storeSettingsUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };
  }

  const settings = await db.storeSettings.upsert({
    where: { id: STORE_SETTINGS_ID },
    create: { id: STORE_SETTINGS_ID, ...parsed.data },
    update: parsed.data,
  });

  await logAudit({
    actorUserId: admin.id,
    action: "settings.update",
    targetType: "StoreSettings",
    targetId: settings.id,
    metadata: parsed.data,
  });

  // "/" plainly (not scoped to a locale) already revalidates the shared
  // storefront layout for every locale — same convention every other
  // admin catalog mutation uses (see e.g. sales.ts). /sale is also
  // revalidated explicitly since this specifically gates that route.
  revalidatePath("/");
  revalidatePath("/sale");
  revalidatePath("/admin/sales");
  return { success: true };
}

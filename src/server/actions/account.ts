"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { updateAccountDetailsSchema, type UpdateAccountDetailsInput } from "@/lib/validators/account";

export type UpdateAccountDetailsResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Name/phone only — email lives in Supabase Auth (changing it would need a
 * re-verification flow that doesn't exist yet) and password has its own
 * dedicated reset flow already (forgot-password). Identity comes from the
 * session via requireUser, never from anything the client sends.
 */
export async function updateAccountDetails(
  input: UpdateAccountDetailsInput
): Promise<UpdateAccountDetailsResult> {
  const user = await requireUser();
  const t = await getTranslations("AccountDetailsForm");

  const parsed = updateAccountDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: t("invalidInput") };
  }

  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone ?? null },
  });

  revalidatePath("/account");
  return { success: true };
}

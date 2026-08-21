"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import { uploadHeroBannerImageFile, deleteHeroBannerImageFile } from "@/server/storage";
import { startOfDayUtc, endOfDayUtc } from "@/lib/heroBanners";
import {
  heroBannerFieldsSchema,
  reorderHeroBannersSchema,
  type ReorderHeroBannersInput,
} from "@/lib/validators/heroBanner";

export type ActionResult = { success: true } | { success: false; error: string };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Pulls the shared text fields out of a FormData and runs them through the schema. */
function parseFields(formData: FormData) {
  return heroBannerFieldsSchema.safeParse({
    headline: String(formData.get("headline") ?? ""),
    subtext: (formData.get("subtext") as string) || "",
    ctaLabel: (formData.get("ctaLabel") as string) || "",
    ctaUrl: String(formData.get("ctaUrl") ?? ""),
    isActive: formData.get("isActive") === "true",
    startsAt: (formData.get("startsAt") as string) || "",
    endsAt: (formData.get("endsAt") as string) || "",
  });
}

/**
 * Creates a hero banner in one step — image + all fields together, unlike
 * product images (which are added on a product's *existing* edit page). A
 * banner without a photo isn't really a banner, so there's no "create the
 * row first, add the photo later" path here the way products have.
 */
export async function createHeroBanner(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a banner image." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: "Only JPEG, PNG, WebP, or GIF images are supported." };
  }
  if (file.size > MAX_BYTES) {
    return { success: false, error: "Image must be under 5MB." };
  }

  const parsed = parseFields(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid banner." };
  }

  let imageUrl: string;
  try {
    imageUrl = await uploadHeroBannerImageFile(file);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Upload failed." };
  }

  const { _max } = await db.heroBanner.aggregate({ _max: { position: true } });
  const { startsAt, endsAt, ...fields } = parsed.data;

  const banner = await db.heroBanner.create({
    data: {
      ...fields,
      imageUrl,
      imageAltText: fields.headline,
      position: (_max.position ?? -1) + 1,
      startsAt: startsAt ? startOfDayUtc(startsAt) : null,
      endsAt: endsAt ? endOfDayUtc(endsAt) : null,
    },
  });

  await logAudit({
    actorUserId: admin.id,
    action: "hero_banner.create",
    targetType: "HeroBanner",
    targetId: banner.id,
    metadata: { headline: fields.headline },
  });

  revalidatePath("/admin/hero-banners");
  revalidatePath("/");
  return { success: true };
}

/**
 * Full-resend update, same model as EditBrandForm/EditDiscountCodeForm —
 * the edit form is pre-filled with the current row and resubmits every
 * text field, so a blank startsAt/endsAt/subtext/ctaLabel means "clear
 * it." The image is the one exception: it's optional here (a new file
 * replaces the old one; no file keeps the existing photo), since forcing
 * a re-upload on every text edit would be a bad workflow.
 */
export async function updateHeroBanner(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const existing = await db.heroBanner.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "That banner no longer exists." };

  const file = formData.get("image");
  let newImageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return { success: false, error: "Only JPEG, PNG, WebP, or GIF images are supported." };
    }
    if (file.size > MAX_BYTES) {
      return { success: false, error: "Image must be under 5MB." };
    }
    try {
      newImageUrl = await uploadHeroBannerImageFile(file);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Upload failed." };
    }
  }

  const parsed = parseFields(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid banner." };
  }
  const { startsAt, endsAt, subtext, ctaLabel, ...fields } = parsed.data;

  await db.heroBanner.update({
    where: { id },
    data: {
      ...fields,
      // subtext/ctaLabel come out of the schema as `undefined` (not "")
      // when cleared — Prisma's update() treats an undefined field as
      // "don't touch this column", which would silently keep the old
      // value instead of clearing it, unlike startsAt/endsAt below which
      // already had this same undefined -> null fallback. Full-resend
      // forms in this codebase are supposed to let a blank field clear a
      // value (see the comment on this function) — this makes that true
      // for subtext/ctaLabel too.
      subtext: subtext ?? null,
      ctaLabel: ctaLabel ?? null,
      imageAltText: fields.headline,
      ...(newImageUrl ? { imageUrl: newImageUrl } : {}),
      startsAt: startsAt ? startOfDayUtc(startsAt) : null,
      endsAt: endsAt ? endOfDayUtc(endsAt) : null,
    },
  });

  // Only delete the old photo once the row is safely pointed at the new
  // one — deleting first and failing the update would orphan the banner.
  if (newImageUrl) {
    await deleteHeroBannerImageFile(existing.imageUrl).catch(() => {});
  }

  await logAudit({
    actorUserId: admin.id,
    action: "hero_banner.update",
    targetType: "HeroBanner",
    targetId: id,
    metadata: { headline: fields.headline },
  });

  revalidatePath("/admin/hero-banners");
  revalidatePath(`/admin/hero-banners/${id}/edit`);
  revalidatePath("/");
  return { success: true };
}

export async function deleteHeroBanner(input: { id: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (typeof input.id !== "string" || !input.id) {
    return { success: false, error: "Invalid request." };
  }

  const banner = await db.heroBanner.findUnique({ where: { id: input.id } });
  if (!banner) return { success: false, error: "That banner no longer exists." };

  await db.heroBanner.delete({ where: { id: input.id } });
  await deleteHeroBannerImageFile(banner.imageUrl).catch(() => {});

  await logAudit({
    actorUserId: admin.id,
    action: "hero_banner.delete",
    targetType: "HeroBanner",
    targetId: input.id,
    metadata: { headline: banner.headline },
  });

  revalidatePath("/admin/hero-banners");
  revalidatePath("/");
  return { success: true };
}

/**
 * Rewrites every banner's position to match the order the admin dragged
 * them into — the whole list is resent (not a single moved item plus a
 * target index) so the server doesn't have to reconstruct drag intent,
 * same "resend the full state" philosophy as the other full-resend edit
 * forms in this codebase, just applied to a list instead of a row.
 */
export async function reorderHeroBanners(input: ReorderHeroBannersInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderHeroBannersSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };

  const updates: Prisma.PrismaPromise<unknown>[] = parsed.data.orderedIds.map((id, index) =>
    db.heroBanner.updateMany({ where: { id }, data: { position: index } })
  );

  await db.$transaction(updates);

  revalidatePath("/admin/hero-banners");
  revalidatePath("/");
  return { success: true };
}

import "server-only";
import { randomUUID } from "node:crypto";

import { createSupabaseAdminClient } from "@/server/auth";

// Must exist as a *public* bucket in the Supabase project (Storage → New
// bucket → "product-images" → Public). Not something this app can create
// for itself from inside a server action — see CLAUDE.md. Despite the
// name, every image this app uploads lives here (product photos under
// "<productId>/", hero banner photos under "hero-banners/") — a second
// bucket per image kind would just be more manual one-time setup for the
// same public-read behavior.
const BUCKET = "product-images";

function extensionOf(file: File): string {
  return file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

async function uploadToBucket(path: string, file: File): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Best-effort delete of a previously uploaded image from Storage. A no-op
 * for URLs that aren't from our bucket (e.g. the local placeholder SVGs
 * seed data still uses) — those just get unlinked from the owning row,
 * nothing to delete in Storage. Shared by every image kind this app
 * uploads (product photos, hero banner photos) since they all live in the
 * same bucket and the delete logic only cares about the URL shape.
 */
async function deleteFromBucket(url: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return;

  const path = url.slice(markerIndex + marker.length);
  const admin = createSupabaseAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
}

/** Uploads a product image to Supabase Storage and returns its public URL. */
export async function uploadProductImageFile(
  productId: string,
  file: File
): Promise<string> {
  return uploadToBucket(`${productId}/${randomUUID()}.${extensionOf(file)}`, file);
}

export async function deleteProductImageFile(url: string): Promise<void> {
  return deleteFromBucket(url);
}

/**
 * Uploads a hero banner's photo. Same bucket as product images (creating a
 * second public bucket just for this would be one more manual Supabase
 * dashboard step for no real benefit — see the BUCKET comment above) under
 * a "hero-banners/" prefix, named by a fresh id since a banner doesn't
 * necessarily exist as a database row yet when its very first image is
 * uploaded (createHeroBanner uploads before creating the row).
 */
export async function uploadHeroBannerImageFile(file: File): Promise<string> {
  return uploadToBucket(`hero-banners/${randomUUID()}.${extensionOf(file)}`, file);
}

export async function deleteHeroBannerImageFile(url: string): Promise<void> {
  return deleteFromBucket(url);
}

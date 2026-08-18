import "server-only";
import { randomUUID } from "node:crypto";

import { createSupabaseAdminClient } from "@/server/auth";

// Must exist as a *public* bucket in the Supabase project (Storage → New
// bucket → "product-images" → Public). Not something this app can create
// for itself from inside a server action — see CLAUDE.md.
const BUCKET = "product-images";

/** Uploads a product image to Supabase Storage and returns its public URL. */
export async function uploadProductImageFile(
  productId: string,
  file: File
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const extension =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${productId}/${randomUUID()}.${extension}`;

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
 * seed data still uses) — those just get unlinked from the ProductImage
 * row, nothing to delete in Storage.
 */
export async function deleteProductImageFile(url: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return;

  const path = url.slice(markerIndex + marker.length);
  const admin = createSupabaseAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
}

import { z } from "zod";

// A URL-safe, lowercase, hyphen-separated slug/handle.
const slugLike = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `${label} must be lowercase, alphanumeric, and hyphen-separated`
    );

export const productStatusSchema = z.enum(["draft", "active", "archived"]);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const productVariantSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64),
  size: z.string().trim().min(1, "Size is required").max(40),
  color: z.string().trim().min(1, "Color is required").max(40),
  // Overrides the product's basePriceCents when set (e.g. a size upcharge).
  priceOverrideCents: z.number().int().nonnegative().optional(),
  inventoryQuantity: z.number().int().nonnegative().default(0),
});
export type ProductVariantInput = z.infer<typeof productVariantSchema>;

export const productSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: slugLike("Slug"),
  description: z.string().trim().max(5000).optional(),
  basePriceCents: z.number().int().nonnegative("Price cannot be negative"),
  status: productStatusSchema.default("draft"),
  collectionIds: z.array(z.string().cuid()).default([]),
  variants: z
    .array(productVariantSchema)
    .min(1, "At least one variant is required"),
});
export type ProductInput = z.infer<typeof productSchema>;

export const productUpdateSchema = productSchema.partial().extend({
  id: z.string().cuid(),
});
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const collectionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  handle: slugLike("Handle"),
  description: z.string().trim().max(2000).optional(),
});
export type CollectionInput = z.infer<typeof collectionSchema>;

export const collectionUpdateSchema = collectionSchema.partial().extend({
  id: z.string().cuid(),
});
export type CollectionUpdateInput = z.infer<typeof collectionUpdateSchema>;

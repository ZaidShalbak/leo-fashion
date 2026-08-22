import { z } from "zod";

// Date-only strings from a plain <input type="date">, converted to UTC
// boundaries in the server action (src/lib/heroBanners.ts's
// startOfDayUtc/endOfDayUtc) — same reasoning as discount.ts's dateOnly.
const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

const optionalDateOnly = z
  .union([dateOnly, z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

export const saleSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title").max(120),
    scope: z.enum(["SITE_WIDE", "COLLECTION", "BRAND"]),
    collectionId: z.string().cuid().optional(),
    brandId: z.string().cuid().optional(),
    percentOff: z
      .number()
      .int("Must be a whole number")
      .min(1, "Must be at least 1%")
      .max(100, "Can't exceed 100%"),
    isActive: z.boolean().default(true),
    startsAt: optionalDateOnly,
    endsAt: optionalDateOnly,
  })
  .refine((v) => v.scope !== "COLLECTION" || v.collectionId, {
    message: "Pick a category",
    path: ["collectionId"],
  })
  .refine((v) => v.scope !== "BRAND" || v.brandId, {
    message: "Pick a brand",
    path: ["brandId"],
  });
export type SaleInput = z.infer<typeof saleSchema>;

// The edit form always resubmits every field (same "full resend" model as
// EditDiscountCodeForm), so .partial() is only needed for the id-less
// create-vs-update type distinction, not because a real partial update is
// expected — the cross-field .refine()s above are re-applied here since
// zod doesn't carry them through .partial() automatically.
export const saleUpdateSchema = z
  .object({
    id: z.string().cuid(),
    title: z.string().trim().min(1, "Enter a title").max(120),
    scope: z.enum(["SITE_WIDE", "COLLECTION", "BRAND"]),
    collectionId: z.string().cuid().optional(),
    brandId: z.string().cuid().optional(),
    percentOff: z.number().int("Must be a whole number").min(1).max(100),
    isActive: z.boolean(),
    startsAt: optionalDateOnly,
    endsAt: optionalDateOnly,
  })
  .refine((v) => v.scope !== "COLLECTION" || v.collectionId, {
    message: "Pick a category",
    path: ["collectionId"],
  })
  .refine((v) => v.scope !== "BRAND" || v.brandId, {
    message: "Pick a brand",
    path: ["brandId"],
  });
export type SaleUpdateInput = z.infer<typeof saleUpdateSchema>;

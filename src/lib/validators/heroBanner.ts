import { z } from "zod";

// createHeroBanner/updateHeroBanner take FormData (they carry an image
// File, same reasoning as uploadProductImage in
// src/server/actions/admin/images.ts — there's no clean way to run a File
// through a Zod schema), so this only covers the non-file text fields.
// Both actions parse a FormData's string entries into a plain object and
// run it through this schema by hand.

const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

export const heroBannerFieldsSchema = z.object({
  headline: z
    .union([z.string().trim().max(120), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  subtext: z
    .union([z.string().trim().max(240), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  ctaLabel: z
    .union([z.string().trim().max(40), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  ctaUrl: z.string().trim().min(1, "Add a link").max(300),
  isActive: z.boolean().default(true),
  startsAt: z
    .union([dateOnly, z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  endsAt: z
    .union([dateOnly, z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type HeroBannerFieldsInput = z.infer<typeof heroBannerFieldsSchema>;

export const reorderHeroBannersSchema = z.object({
  orderedIds: z.array(z.string().cuid()).min(1),
});
export type ReorderHeroBannersInput = z.infer<typeof reorderHeroBannersSchema>;

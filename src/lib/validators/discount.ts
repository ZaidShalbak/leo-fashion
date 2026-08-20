import { z } from "zod";

// Codes are normalized uppercase everywhere (storage, lookup, display) so
// "summer20" and "SUMMER20" are the same code — case-insensitive without
// needing a citext column or a lower() index.
const codeLike = z
  .string()
  .trim()
  .min(3, "Code must be at least 3 characters")
  .max(40)
  .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens only")
  .transform((v) => v.toUpperCase());

// expiresAt comes from a plain <input type="date"> ("YYYY-MM-DD"), not a
// full ISO timestamp — kept as a date-only string through validation and
// converted to an end-of-day-UTC Date in the server action (see
// src/lib/discount.ts's endOfDayUtc), same reasoning as elsewhere in this
// codebase for keeping form-shaped strings out of Zod's stricter datetime
// parsing until they're actually turned into a Date.
const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

export const discountCodeSchema = z.object({
  code: codeLike,
  percentOff: z
    .number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1%")
    .max(100, "Can't exceed 100%"),
  isActive: z.boolean().default(true),
  expiresAt: z
    .union([dateOnly, z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  minSubtotalCents: z.number().int().nonnegative().optional(),
  maxRedemptions: z.number().int().positive().optional(),
});
export type DiscountCodeInput = z.infer<typeof discountCodeSchema>;

export const discountCodeUpdateSchema = discountCodeSchema.partial().extend({
  id: z.string().cuid(),
});
export type DiscountCodeUpdateInput = z.infer<typeof discountCodeUpdateSchema>;

export const applyDiscountCodeSchema = z.object({
  code: z.string().trim().min(1, "Enter a code").max(40),
});
export type ApplyDiscountCodeInput = z.infer<typeof applyDiscountCodeSchema>;

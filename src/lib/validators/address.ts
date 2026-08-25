import { z } from "zod";

import { optionalPhoneSchema } from "./phone";

// state/postalCode/country are no longer collected at checkout (see
// CheckoutForm) — kept optional here (not removed) since the columns
// still exist for historical rows. line1 is repurposed as a single
// "Street" field; line2 is no longer collected either.
export const addressSchema = z.object({
  label: z.string().trim().max(60).optional(),
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  line1: z.string().trim().min(1, "Street is required").max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, "City is required").max(120),
  state: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(120).optional(),
  phone: optionalPhoneSchema,
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const addressUpdateSchema = addressSchema.partial().extend({
  id: z.string().cuid(),
});
export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;

import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().trim().max(60).optional(),
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  line1: z.string().trim().min(1, "Address line 1 is required").max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, "City is required").max(120),
  state: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().min(1, "Postal code is required").max(20),
  country: z.string().trim().min(1, "Country is required").max(120),
  phone: z.string().trim().max(30).optional(),
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const addressUpdateSchema = addressSchema.partial().extend({
  id: z.string().cuid(),
});
export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;

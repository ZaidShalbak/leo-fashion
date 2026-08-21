import { z } from "zod";

export const deliveryZoneSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  feeCents: z.number().int().nonnegative("Fee can't be negative"),
  isActive: z.boolean().default(true),
  position: z.number().int().default(0),
});
export type DeliveryZoneInput = z.infer<typeof deliveryZoneSchema>;

export const deliveryZoneUpdateSchema = deliveryZoneSchema.partial().extend({
  id: z.string().cuid(),
});
export type DeliveryZoneUpdateInput = z.infer<typeof deliveryZoneUpdateSchema>;

import { z } from "zod";

const slugLike = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(200)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase, alphanumeric, and hyphen-separated"
  );

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: slugLike,
  logoUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional(),
});
export type BrandInput = z.infer<typeof brandSchema>;

export const brandUpdateSchema = brandSchema.partial().extend({
  id: z.string().cuid(),
});
export type BrandUpdateInput = z.infer<typeof brandUpdateSchema>;

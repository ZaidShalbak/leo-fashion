import { z } from "zod";

import { optionalPhoneSchema } from "./phone";

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: optionalPhoneSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

// Same rule as signUpSchema.password — kept as a separate schema (not
// reused directly) since a reset form only ever has this one field, not
// name/email/password together.
export const newPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

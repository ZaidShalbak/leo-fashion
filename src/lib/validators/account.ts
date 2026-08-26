import { z } from "zod";

import { optionalPhoneSchema } from "./phone";

// Editable from the account page — only name/phone, same fields the sign-up
// form itself collects (besides email/password, which aren't editable here;
// see AccountDetailsForm's comment for why).
export const updateAccountDetailsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: optionalPhoneSchema,
});
export type UpdateAccountDetailsInput = z.infer<typeof updateAccountDetailsSchema>;

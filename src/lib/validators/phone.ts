import { z } from "zod";

// Only Palestine and Israel are served today — see CheckoutForm/SignUpForm.
// `labelKey` points at a key in the shared `Phone` message namespace so the
// UI and the validator agree on one source of truth for the country list.
export const PHONE_COUNTRIES = [
  { code: "+970", labelKey: "palestine" },
  { code: "+972", labelKey: "israel" },
] as const;
export type PhoneCountryCode = (typeof PHONE_COUNTRIES)[number]["code"];

// Palestinian and Israeli mobile numbers are both 9 digits after the
// country code, starting with 5 (e.g. +970595737545, +972595737545) —
// matches the format already used for the store's own WhatsApp number
// (see WhatsAppButton.tsx) and real delivery-zone contacts in this
// project. A combined "+970" + 9-digit value, exactly what PhoneInput's
// hidden field produces.
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+970|\+972)5\d{8}$/, "Enter a valid Palestine or Israel mobile number");

// Same "blank string means absent" transform already used for optional
// free-text fields elsewhere in this codebase (see placeOrderSchema's
// `notes` field) — PhoneInput's hidden field is either "" or a
// fully-shaped country-code+digits string, never a partial one.
export const optionalPhoneSchema = z
  .union([phoneSchema, z.literal("")])
  .transform((v) => (v ? v : undefined))
  .optional();

/**
 * Normalizes a stored phone number into wa.me's expected format (digits
 * only — country code, no leading +/00/spaces/dashes).
 *
 * Known limitation, accepted when this was built: phone numbers aren't
 * always stored with a real country code yet (see the phone +
 * country-code work in src/lib/validators/phone.ts, which only new
 * signups/checkouts go through going forward) — a bare local number
 * (e.g. "0595737545") has no country code for this to add, so the
 * resulting link may not resolve to the right WhatsApp contact until
 * that data is properly formatted. This still strips whatever
 * punctuation is present and a leading "00" international-dialing
 * prefix, so a properly country-coded number (e.g. "+970595737545")
 * already works correctly today.
 */
export function buildWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  return `https://wa.me/${digits}`;
}

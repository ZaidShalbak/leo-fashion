"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PHONE_COUNTRIES, type PhoneCountryCode } from "@/lib/validators/phone";

/**
 * Country-code select + digits input, joined into one hidden
 * `<input type="hidden" name={name}>` so it drops into existing
 * `FormData.get(name)`-based forms (CheckoutForm, SignUpForm) with no
 * call-site restructuring — the combined value is exactly what
 * phoneSchema/optionalPhoneSchema expect ("+970"/"+972" + 9 digits).
 * `defaultValue`, if given, is split back into country + digits for
 * editing (e.g. a pre-filled saved address).
 */
export function PhoneInput({
  name,
  id,
  defaultValue,
  required,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  const t = useTranslations("Phone");

  const matchedCountry = PHONE_COUNTRIES.find((c) => defaultValue?.startsWith(c.code));
  const [country, setCountry] = useState<PhoneCountryCode>(
    matchedCountry?.code ?? PHONE_COUNTRIES[0].code
  );
  const [digits, setDigits] = useState(
    matchedCountry ? (defaultValue ?? "").slice(matchedCountry.code.length) : ""
  );

  const combined = digits ? `${country}${digits}` : "";

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={combined} />
      <Select value={country} onValueChange={(value) => setCountry(value as PhoneCountryCode)}>
        <SelectTrigger className="w-32 shrink-0" aria-label={t("countryLabel")} dir="ltr">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PHONE_COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code} aria-label={`${t(c.labelKey)} ${c.code}`}>
              {c.flag} {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        dir="ltr"
        inputMode="numeric"
        autoComplete="tel-national"
        required={required}
        placeholder="59XXXXXXX"
        value={digits}
        onChange={(event) => setDigits(event.target.value.replace(/\D/g, ""))}
        className="flex-1"
      />
    </div>
  );
}

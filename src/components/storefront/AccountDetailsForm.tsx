"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "./PhoneInput";
import { updateAccountDetailsSchema } from "@/lib/validators/account";
import { updateAccountDetails } from "@/server/actions/account";

/**
 * Name/phone only — email and password aren't editable here (see
 * account.ts's updateAccountDetails comment for why). Email is still shown,
 * read-only, so this reads as a complete "your details" section rather
 * than an odd two-field form missing an obviously-expected value.
 */
export function AccountDetailsForm({
  email,
  defaultName,
  defaultPhone,
}: {
  email: string;
  defaultName: string;
  defaultPhone: string | null;
}) {
  const t = useTranslations("AccountDetailsForm");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function clearStatus() {
    setError(null);
    setSaved(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearStatus();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const phone = String(formData.get("phone") ?? "");

    const parsed = updateAccountDetailsSchema.safeParse({ name, phone });
    if (!parsed.success) {
      setError(t("nameRequired"));
      return;
    }

    startTransition(async () => {
      const result = await updateAccountDetails(parsed.data);
      if (result.success) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="accountEmail">{t("email")}</Label>
        <Input id="accountEmail" value={email} disabled dir="ltr" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" defaultValue={defaultName} onChange={clearStatus} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">{t("phone")}</Label>
        <PhoneInput id="phone" name="phone" defaultValue={defaultPhone} />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-green-700 dark:text-green-500">{t("saved")}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

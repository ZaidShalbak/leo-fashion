"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { newPasswordSchema } from "@/lib/validators/auth";
import { confirmPasswordReset } from "@/server/actions/auth";

export function ResetPasswordForm() {
  const t = useTranslations("ResetPasswordForm");
  const tPassword = useTranslations("PasswordInput");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");

    const parsed = newPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setFieldError(t("passwordTooShort"));
      return;
    }
    setFieldError(null);

    startTransition(async () => {
      const result = await confirmPasswordReset(parsed.data);
      // On success the action redirects and never resolves here.
      if (!result.success) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          aria-invalid={!!fieldError}
          onChange={() => setFieldError(null)}
          toggleAriaLabel={{ show: tPassword("show"), hide: tPassword("hide") }}
        />
        {fieldError ? (
          <p role="alert" className="text-destructive text-xs">
            {fieldError}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">{t("passwordHint")}</p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("saving") : t("resetPassword")}
      </Button>
    </form>
  );
}

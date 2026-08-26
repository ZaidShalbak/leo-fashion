"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "./PhoneInput";
import { cn } from "@/lib/utils";
import { signUpSchema } from "@/lib/validators/auth";
import { signUp } from "@/server/actions/auth";

type FieldErrors = { name?: string; email?: string; password?: string; phone?: string };

export function SignUpForm({
  redirectTo,
  defaultName,
  defaultEmail,
  defaultPhone,
  claimOrderId,
}: {
  redirectTo: string;
  /** Pre-fills from a just-placed guest order (see the order-confirmation
   * page's "save this order to an account" prompt) — signUp itself
   * re-verifies the email against that order before claiming it, so a
   * changed email here just means the claim silently doesn't happen. */
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  claimOrderId?: string;
}) {
  const t = useTranslations("SignUpForm");
  const tPassword = useTranslations("PasswordInput");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  // Translated per-field messages, kept separate from signUpSchema's own
  // (English-only) zod messages — this form is bilingual, so the raw
  // schema message can't be shown directly.
  function fieldErrorMessage(field: keyof FieldErrors, code: string): string {
    if (field === "name") return t("nameRequired");
    if (field === "email") return t("emailInvalid");
    if (field === "phone") return t("phoneInvalid");
    // password
    return code === "too_small" ? t("passwordTooShort") : t("passwordInvalid");
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const phone = String(formData.get("phone") ?? "");

    const parsed = signUpSchema.safeParse({ name, email, password, phone });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (field && !nextErrors[field]) {
          nextErrors[field] = fieldErrorMessage(field, issue.code);
        }
      }
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      const result = await signUp(parsed.data, redirectTo, claimOrderId);
      // On success the action redirects and never resolves here.
      if (!result.success) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("name")}</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={defaultName}
          aria-invalid={!!fieldErrors.name}
          onChange={() => clearFieldError("name")}
          className={cn(fieldErrors.name && "border-destructive")}
        />
        {fieldErrors.name && (
          <p role="alert" className="text-destructive text-xs">
            {fieldErrors.name}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          dir="ltr"
          defaultValue={defaultEmail}
          aria-invalid={!!fieldErrors.email}
          onChange={() => clearFieldError("email")}
          className={cn(fieldErrors.email && "border-destructive")}
        />
        {fieldErrors.email && (
          <p role="alert" className="text-destructive text-xs">
            {fieldErrors.email}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          aria-invalid={!!fieldErrors.password}
          onChange={() => clearFieldError("password")}
          className={cn(fieldErrors.password && "border-destructive")}
          toggleAriaLabel={{ show: tPassword("show"), hide: tPassword("hide") }}
        />
        {fieldErrors.password ? (
          <p role="alert" className="text-destructive text-xs">
            {fieldErrors.password}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">{t("passwordHint")}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">{t("phone")}</Label>
        <PhoneInput id="phone" name="phone" defaultValue={defaultPhone} />
        {fieldErrors.phone && (
          <p role="alert" className="text-destructive text-xs">
            {fieldErrors.phone}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("creatingAccount") : t("createAccount")}
      </Button>
    </form>
  );
}

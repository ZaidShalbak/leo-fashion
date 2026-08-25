"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { signInSchema } from "@/lib/validators/auth";
import { signIn } from "@/server/actions/auth";

type FieldErrors = { email?: string; password?: string };

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const t = useTranslations("LoginForm");
  const tPassword = useTranslations("PasswordInput");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  // Same per-field translated mapping SignUpForm uses — each field in
  // signInSchema has exactly one validation rule, so the field name alone
  // is enough to pick the right message.
  function fieldErrorMessage(field: keyof FieldErrors): string {
    if (field === "email") return t("emailInvalid");
    return t("passwordRequired");
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (field && !nextErrors[field]) {
          nextErrors[field] = fieldErrorMessage(field);
        }
      }
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      const result = await signIn(parsed.data, redirectTo);
      // On success the action redirects and never resolves here.
      if (!result.success) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          dir="ltr"
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("password")}</Label>
          <Link href="/forgot-password" className="text-muted-foreground text-xs underline">
            {t("forgotPassword")}
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          aria-invalid={!!fieldErrors.password}
          onChange={() => clearFieldError("password")}
          className={cn(fieldErrors.password && "border-destructive")}
          toggleAriaLabel={{ show: tPassword("show"), hide: tPassword("hide") }}
        />
        {fieldErrors.password && (
          <p role="alert" className="text-destructive text-xs">
            {fieldErrors.password}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}

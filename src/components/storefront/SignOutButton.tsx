"use client";

import { useTransition } from "react";

import { signOut } from "@/server/actions/auth";

/**
 * Shared between MobileNav (storefront, locale-aware) and the admin
 * layout (always English, and — crucially — rendered outside the
 * [locale] tree with no NextIntlClientProvider ancestor, see
 * src/app/admin/layout.tsx). That means this component can't call
 * next-intl's useTranslations itself, or it would crash when rendered
 * from admin. Instead it takes the label text as props, defaulting to
 * English for admin's plain, prop-less usage; MobileNav passes its own
 * translated strings.
 */
export function SignOutButton({
  label = "Sign out",
  pendingLabel = "Signing out…",
}: {
  label?: string;
  pendingLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
      className="text-muted-foreground hover:text-foreground text-sm transition disabled:opacity-50"
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}

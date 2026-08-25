"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "EN",
  ar: "AR",
};

/**
 * Same two-way toggle as the storefront's LanguageSwitcher (see
 * src/components/storefront/LanguageSwitcher.tsx) — a separate component
 * rather than reusing that one directly because it's styled for the
 * storefront's dark header (white/translucent borders and text), which
 * would be invisible against admin's light header. Logic is identical.
 */
export function AdminLanguageSwitcher() {
  const t = useTranslations("AdminLayout");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(nextLocale: AppLocale) {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("languageSwitcherLabel")}
      className="border-border text-muted-foreground inline-flex items-center rounded-md border p-0.5 text-xs"
    >
      {(Object.keys(LOCALE_LABELS) as AppLocale[]).map((code) => (
        <button
          key={code}
          type="button"
          disabled={isPending}
          onClick={() => switchTo(code)}
          aria-pressed={code === locale}
          className={
            code === locale
              ? "bg-foreground text-background rounded px-2 py-1 font-medium"
              : "hover:text-foreground rounded px-2 py-1 transition"
          }
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}

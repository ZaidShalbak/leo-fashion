import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { ForgotPasswordForm } from "@/components/storefront/ForgotPasswordForm";

type Props = {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ForgotPasswordPage" });
  return { title: t("title") };
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const t = await getTranslations("ForgotPasswordPage");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>

      {error === "expired" && (
        <p role="alert" className="text-destructive mt-4 text-sm">
          {t("linkExpired")}
        </p>
      )}

      <div className="mt-8">
        <ForgotPasswordForm />
      </div>

      <p className="text-muted-foreground mt-6 text-sm">
        <Link href="/login" className="text-foreground underline">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}

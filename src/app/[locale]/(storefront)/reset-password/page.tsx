import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getSupabaseUser } from "@/server/auth";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { ResetPasswordForm } from "@/components/storefront/ResetPasswordForm";

type Props = {
  params: Promise<{ locale: AppLocale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ResetPasswordPage" });
  return { title: t("title") };
}

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;

  // No active (recovery) session means someone hit this URL directly
  // without a valid link from /auth/confirm — send them to request a
  // real one instead of showing a form that can't actually succeed.
  const authUser = await getSupabaseUser();
  if (!authUser) {
    redirect({ href: "/forgot-password", locale });
  }

  const t = await getTranslations("ResetPasswordPage");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>

      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </div>
  );
}

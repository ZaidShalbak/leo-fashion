import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { LoginForm } from "@/components/storefront/LoginForm";

type Props = {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ next?: string }>;
};

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "LoginPage" });
  return { title: t("title") };
}

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const redirectTo = next && next.startsWith("/") ? next : "/";
  const t = await getTranslations("LoginPage");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{t("welcomeBack")}</p>

      <div className="mt-8">
        <LoginForm redirectTo={redirectTo} />
      </div>

      <p className="text-muted-foreground mt-6 text-sm">
        {t("noAccount")}{" "}
        <Link
          href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-foreground underline"
        >
          {t("createOne")}
        </Link>
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { SignUpForm } from "@/components/storefront/SignUpForm";

type Props = {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ next?: string }>;
};

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SignUpPage" });
  return { title: t("title") };
}

export default async function SignUpPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const redirectTo = next && next.startsWith("/") ? next : "/";
  const t = await getTranslations("SignUpPage");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>

      <div className="mt-8">
        <SignUpForm redirectTo={redirectTo} />
      </div>

      <p className="text-muted-foreground mt-6 text-sm">
        {t("haveAccount")}{" "}
        <Link
          href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-foreground underline"
        >
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}

import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function CollectionNotFound() {
  const t = await getTranslations("CollectionNotFound");

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground mt-2">{t("description")}</p>
      <Link href="/" className="mt-6 inline-block underline">
        {t("backToHomepage")}
      </Link>
    </div>
  );
}

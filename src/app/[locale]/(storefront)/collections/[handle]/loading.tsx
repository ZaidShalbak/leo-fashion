import { getTranslations } from "next-intl/server";

import { PageLoadingState } from "@/components/storefront/PageLoadingState";

export default async function CollectionLoading() {
  const t = await getTranslations("Loading");
  return <PageLoadingState label={t("label")} />;
}

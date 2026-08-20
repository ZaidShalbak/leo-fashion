import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { OrderDetail } from "@/components/storefront/OrderDetail";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ orderId: string; locale: AppLocale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OrderConfirmation" });
  return { title: t("metaTitle") };
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { orderId, locale } = await params;
  const user = await requireUser(`/order-confirmation/${orderId}`);
  const t = await getTranslations("OrderConfirmation");

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("subheading")}</p>
      </div>

      <OrderDetail order={order} locale={locale} />

      <div className="mt-8 flex justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/">{t("continueShopping")}</Link>
        </Button>
        <Button asChild>
          <Link href="/account/orders">{t("viewMyOrders")}</Link>
        </Button>
      </div>
    </div>
  );
}

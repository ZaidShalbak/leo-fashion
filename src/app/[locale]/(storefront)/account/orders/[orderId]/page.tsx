import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { OrderDetail } from "@/components/storefront/OrderDetail";
import { OrderStatusTimeline } from "@/components/storefront/OrderStatusTimeline";

type Props = {
  params: Promise<{ orderId: string; locale: AppLocale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountOrderDetail" });
  return { title: t("metaTitle") };
}

export default async function AccountOrderDetailPage({ params }: Props) {
  const { orderId, locale } = await params;
  const user = await requireUser(`/account/orders/${orderId}`);
  const t = await getTranslations("AccountOrderDetail");

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/account/orders"
        className="text-muted-foreground text-sm underline"
      >
        {/* Direction-aware "back" arrow — a plain "←" would point the wrong
            way for a reading-start-ward link once the page is RTL. */}
        {locale === "ar" ? "→" : "←"} {t("allOrders")}
      </Link>
      <div className="mt-6 grid gap-10 md:grid-cols-[1fr_260px]">
        <OrderDetail order={order} locale={locale} />
        <OrderStatusTimeline order={order} locale={locale} />
      </div>
    </div>
  );
}

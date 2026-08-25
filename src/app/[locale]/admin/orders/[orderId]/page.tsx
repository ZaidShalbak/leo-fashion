import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import type { AppLocale } from "@/i18n/routing";
import { OrderDetail } from "@/components/storefront/OrderDetail";
import { OrderStatusTimeline } from "@/components/storefront/OrderStatusTimeline";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";
import { MarkOrderViewed } from "@/components/admin/MarkOrderViewed";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/orders/[orderId]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminOrders" });
  return { title: t("detailMetaTitle") };
}

export default async function AdminOrderDetailPage({
  params,
}: PageProps<"/[locale]/admin/orders/[orderId]">) {
  const { orderId, locale } = await params;
  const t = await getTranslations("AdminOrders");

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: { select: { email: true, name: true } } },
  });

  if (!order) notFound();

  return (
    <div className="max-w-6xl">
      <MarkOrderViewed orderId={order.id} alreadyViewed={order.viewedByAdminAt !== null} />
      <p className="text-muted-foreground mb-6 text-sm">
        {t("customerLine", { name: order.user.name ?? "—", email: order.user.email })}
      </p>

      <div className="grid gap-10 lg:grid-cols-[1fr_260px_300px]">
        <OrderDetail order={order} locale={locale as AppLocale} />
        <OrderStatusTimeline order={order} locale={locale as AppLocale} />
        <OrderStatusControl
          orderId={order.id}
          currentStatus={order.status}
          currentTrackingNumber={order.trackingNumber}
        />
      </div>
    </div>
  );
}

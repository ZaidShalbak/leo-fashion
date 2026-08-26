import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { OrderDetail } from "@/components/storefront/OrderDetail";
import { OrderStatusTimeline } from "@/components/storefront/OrderStatusTimeline";
import { SignUpForm } from "@/components/storefront/SignUpForm";
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
  // Guest checkout means this page can no longer flatly requireUser — a
  // guest who just checked out has no session to require. Signed-in-owned
  // orders still need the matching session; a guest order (userId null)
  // has none to match against, so the unguessable cuid order id is what
  // actually protects it — same posture Stripe/Shopify checkout
  // confirmation links use.
  const user = await getCurrentUser();
  const t = await getTranslations("OrderConfirmation");

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || (order.userId && order.userId !== user?.id)) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("subheading")}</p>
      </div>

      <div className="grid gap-10 md:grid-cols-[1fr_260px]">
        <OrderDetail order={order} locale={locale} />
        <OrderStatusTimeline order={order} locale={locale} />
      </div>

      {!order.userId && (
        <div className="border-border mx-auto mt-10 max-w-md rounded-lg border p-6">
          <h2 className="font-medium">{t("saveOrderHeading")}</h2>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">{t("saveOrderSubtext")}</p>
          <SignUpForm
            redirectTo={`/order-confirmation/${orderId}`}
            defaultName={order.shippingName}
            defaultEmail={order.guestEmail ?? undefined}
            defaultPhone={order.shippingPhone ?? undefined}
            claimOrderId={order.id}
          />
        </div>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/">{t("continueShopping")}</Link>
        </Button>
        {user && (
          <Button asChild>
            <Link href="/account/orders">{t("viewMyOrders")}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrderStatus } from "@/server/actions/admin/orders";
import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@/lib/validators/order";

export function OrderStatusControl({
  orderId,
  currentStatus,
  currentTrackingNumber,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  currentTrackingNumber: string | null;
}) {
  const t = useTranslations("AdminOrders");
  const tStatus = useTranslations("OrderStatus");
  const STATUS_LABEL: Record<OrderStatus, string> = {
    pending: tStatus("pending"),
    processing: tStatus("processing"),
    shipped: tStatus("shipped"),
    delivered: tStatus("delivered"),
    cancelled: tStatus("cancelled"),
  };
  const nextOptions = ORDER_STATUS_TRANSITIONS[currentStatus];
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canChangeStatus = nextOptions.length > 0;
  const hasChanges = status !== currentStatus || trackingNumber !== (currentTrackingNumber ?? "");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateOrderStatus({
        orderId,
        status,
        trackingNumber: trackingNumber.trim() || undefined,
      });
      if (result.success) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border-border space-y-4 rounded-lg border p-4">
      <div className="space-y-1.5">
        <Label>{t("statusLabel")}</Label>
        {canChangeStatus ? (
          <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={currentStatus}>
                {t("statusCurrent", { status: STATUS_LABEL[currentStatus] })}
              </SelectItem>
              {nextOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("noFurtherTransitions", { status: STATUS_LABEL[currentStatus] })}
          </p>
        )}
      </div>

      {(status === "shipped" || currentStatus === "shipped" || currentStatus === "delivered") && (
        <div className="space-y-1.5">
          <Label htmlFor="trackingNumber">{t("trackingNumberLabel")}</Label>
          <Input
            id="trackingNumber"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder={t("trackingNumberPlaceholder")}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-green-700">{t("saved")}</p>}

      <Button type="submit" size="sm" disabled={isPending || !hasChanges}>
        {isPending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

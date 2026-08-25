"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

export function OrderStatusFilter() {
  const t = useTranslations("AdminOrders");
  const tStatus = useTranslations("OrderStatus");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "all";

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("status");
    else params.set("status", value);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Select value={current} onValueChange={setStatus}>
      <SelectTrigger size="sm" className="w-44">
        <SelectValue placeholder={t("statusPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("allStatuses")}</SelectItem>
        {STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {tStatus(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

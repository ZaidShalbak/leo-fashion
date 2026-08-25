import { LayoutGridIcon, TableIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Switches AdminProductsPage between table and grid view via a `?view=`
 * URL param (not local component state) — bookmarkable/shareable, and
 * matches the one existing admin precedent for view-affecting query state
 * (Inventory's `?threshold=` param). Plain links, no client JS needed.
 */
export function AdminProductsViewToggle({ view }: { view: "table" | "grid" }) {
  const t = useTranslations("AdminProducts");
  return (
    <div className="border-border flex items-center rounded-md border p-0.5">
      <Link
        href="/admin/products?view=table"
        aria-label={t("tableView")}
        aria-current={view === "table" ? "true" : undefined}
        className={cn(
          "rounded-sm p-1.5 transition",
          view === "table"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <TableIcon className="size-4" />
      </Link>
      <Link
        href="/admin/products?view=grid"
        aria-label={t("gridView")}
        aria-current={view === "grid" ? "true" : undefined}
        className={cn(
          "rounded-sm p-1.5 transition",
          view === "grid"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutGridIcon className="size-4" />
      </Link>
    </div>
  );
}

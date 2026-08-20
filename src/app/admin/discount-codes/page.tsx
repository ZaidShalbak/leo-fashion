import Link from "next/link";
import type { Metadata } from "next";

import { db } from "@/server/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";
import { NewDiscountCodeForm } from "@/components/admin/NewDiscountCodeForm";
import { DeleteDiscountCodeButton } from "@/components/admin/DeleteDiscountCodeButton";

export const metadata: Metadata = { title: "Discount codes — Admin" };

export default async function AdminDiscountCodesPage() {
  const discountCodes = await db.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  const now = new Date().getTime();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Discount codes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Percentage-off codes applied to a customer&apos;s whole order at
          checkout.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Off</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Min. order</TableHead>
            <TableHead>Redemptions</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {discountCodes.map((dc) => {
            const expired = dc.expiresAt ? dc.expiresAt.getTime() < now : false;
            const limitReached =
              dc.maxRedemptions != null && dc.redemptionCount >= dc.maxRedemptions;
            return (
              <TableRow key={dc.id}>
                <TableCell>
                  <Link
                    href={`/admin/discount-codes/${dc.id}/edit`}
                    className="font-medium hover:underline"
                  >
                    {dc.code}
                  </Link>
                </TableCell>
                <TableCell>{dc.percentOff}%</TableCell>
                <TableCell>
                  {!dc.isActive ? (
                    <Badge variant="secondary">Inactive</Badge>
                  ) : expired ? (
                    <Badge variant="secondary">Expired</Badge>
                  ) : limitReached ? (
                    <Badge variant="secondary">Limit reached</Badge>
                  ) : (
                    <Badge>Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dc.expiresAt
                    ? dc.expiresAt.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dc.minSubtotalCents != null ? formatPriceCents(dc.minSubtotalCents) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dc.redemptionCount}
                  {dc.maxRedemptions != null ? ` / ${dc.maxRedemptions}` : ""}
                </TableCell>
                <TableCell>
                  <DeleteDiscountCodeButton discountCodeId={dc.id} code={dc.code} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {discountCodes.length === 0 && (
        <p className="text-muted-foreground text-sm">No discount codes yet.</p>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Add a discount code</h2>
        <NewDiscountCodeForm />
      </div>
    </div>
  );
}

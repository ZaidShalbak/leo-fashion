import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { EditDiscountCodeForm } from "@/components/admin/EditDiscountCodeForm";

export const metadata: Metadata = { title: "Edit discount code — Admin" };

type Props = {
  params: Promise<{ discountCodeId: string }>;
};

export default async function EditDiscountCodePage({ params }: Props) {
  const { discountCodeId } = await params;

  const discountCode = await db.discountCode.findUnique({ where: { id: discountCodeId } });
  if (!discountCode) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit discount code</h1>
        <p className="text-muted-foreground mt-1 text-sm">{discountCode.code}</p>
      </div>

      <EditDiscountCodeForm discountCode={discountCode} />
    </div>
  );
}

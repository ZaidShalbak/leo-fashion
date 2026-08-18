"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { placeOrderSchema, type PlaceOrderInput } from "@/lib/validators/order";
import { calculateSubtotalCents, effectivePriceCents } from "@/lib/cart-totals";

export type PlaceOrderResult = { success: false; error: string };

/** Thrown inside the transaction to abort and roll back with a clear message. */
class OrderPlacementError extends Error {}

/**
 * Places an order for everything currently in the caller's cart.
 *
 * Security note: `input.items` is only used to fail fast on an empty cart
 * at the validation layer (see placeOrderSchema) — the actual order is
 * built from the user's *live* cart, re-read from the database inside the
 * transaction below, never from whatever the client claims it's ordering.
 * That's a deliberately stronger reading of the "never trust client
 * payload" rule in CLAUDE.md: even a tampered variantId/quantity in the
 * request can't affect what gets ordered.
 *
 * Stock safety: each line decrements ProductVariant.inventoryQuantity with
 * a conditional `updateMany` (`WHERE inventoryQuantity >= quantity`) rather
 * than a read-then-write — Postgres evaluates that WHERE clause against
 * the latest committed row when two transactions race for the same
 * low-stock variant, so at most one of them can succeed. If any line comes
 * up short, the whole transaction throws and rolls back — no partial
 * orders.
 */
export async function placeOrder(
  input: PlaceOrderInput
): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Please sign in to place an order." };
  }

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid checkout details.",
    };
  }

  // Resolve the shipping address snapshot up front (outside the
  // transaction — it's just a read/validate step).
  let shipping: {
    shippingName: string;
    shippingLine1: string;
    shippingLine2: string | null;
    shippingCity: string;
    shippingState: string | null;
    shippingPostalCode: string;
    shippingCountry: string;
    shippingPhone: string | null;
  };
  let newAddressToSave: Prisma.AddressCreateWithoutUserInput | null = null;

  if ("savedAddressId" in parsed.data.address) {
    const saved = await db.address.findUnique({
      where: { id: parsed.data.address.savedAddressId },
    });
    if (!saved || saved.userId !== user.id) {
      return { success: false, error: "That address couldn't be found." };
    }
    shipping = {
      shippingName: saved.fullName,
      shippingLine1: saved.line1,
      shippingLine2: saved.line2,
      shippingCity: saved.city,
      shippingState: saved.state,
      shippingPostalCode: saved.postalCode,
      shippingCountry: saved.country,
      shippingPhone: saved.phone,
    };
  } else {
    const a = parsed.data.address.newAddress;
    shipping = {
      shippingName: a.fullName,
      shippingLine1: a.line1,
      shippingLine2: a.line2 ?? null,
      shippingCity: a.city,
      shippingState: a.state ?? null,
      shippingPostalCode: a.postalCode,
      shippingCountry: a.country,
      shippingPhone: a.phone ?? null,
    };
    // Save it to the address book too, so it's selectable as a "saved
    // address" on the next order — there's no separate address-management
    // UI yet (Phase 3 scope is checkout, not account settings), so this is
    // the only way a saved address ever gets created.
    const existingCount = await db.address.count({ where: { userId: user.id } });
    newAddressToSave = { ...a, isDefault: existingCount === 0 };
  }

  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { product: true, variant: true } } },
  });

  if (!cart || cart.items.length === 0) {
    return { success: false, error: "Your cart is empty." };
  }

  let orderId: string;
  try {
    orderId = await db.$transaction(async (tx) => {
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

      for (const item of cart.items) {
        if (item.product.status !== "active") {
          throw new OrderPlacementError(
            `${item.product.title} is no longer available.`
          );
        }

        const updateResult = await tx.productVariant.updateMany({
          where: { id: item.variantId, inventoryQuantity: { gte: item.quantity } },
          data: { inventoryQuantity: { decrement: item.quantity } },
        });
        if (updateResult.count === 0) {
          throw new OrderPlacementError(
            `Only a limited quantity of ${item.product.title} (${item.variant.size}/${item.variant.color}) is left — please update your cart and try again.`
          );
        }

        orderItemsData.push({
          productId: item.productId,
          variantId: item.variantId,
          titleSnapshot: item.product.title,
          size: item.variant.size,
          color: item.variant.color,
          priceCents: effectivePriceCents(
            item.product.basePriceCents,
            item.variant.priceOverrideCents
          ),
          quantity: item.quantity,
        });
      }

      const subtotalCents = calculateSubtotalCents(orderItemsData);

      if (newAddressToSave) {
        await tx.address.create({
          data: { ...newAddressToSave, userId: user.id },
        });
      }

      const order = await tx.order.create({
        data: {
          userId: user.id,
          status: "pending",
          subtotalCents,
          ...shipping,
          items: { createMany: { data: orderItemsData } },
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order.id;
    });
  } catch (error) {
    if (error instanceof OrderPlacementError) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  revalidatePath("/cart");
  revalidatePath("/account/orders");
  redirect(`/order-confirmation/${orderId}`);
}

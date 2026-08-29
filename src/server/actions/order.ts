"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getCurrentCart } from "@/server/actions/cart";
import { sendAdminNewOrderEmail } from "@/server/email";
import { placeOrderSchema, type PlaceOrderInput } from "@/lib/validators/order";
import { calculateSubtotalCents, effectivePriceCents } from "@/lib/cart-totals";
import { getBestSaleForProduct, getSaleAdjustedPriceCents } from "@/lib/sales";
import { validateDiscountCode } from "@/lib/discount";
import type { AppLocale } from "@/i18n/routing";

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
  const t = await getTranslations("PlaceOrder");
  const locale = (await getLocale()) as AppLocale;

  const user = await getCurrentUser();

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    // Bypassing the raw Zod issue message on purpose, same policy as
    // applyDiscountCode in discount.ts — the checkout form always submits
    // browser-validated, well-formed data, so a parse failure here only
    // realistically happens from tampering, not a normal user mistake.
    // One translated fallback string covers it.
    return { success: false, error: t("invalidCheckoutDetails") };
  }

  // Guest checkout is allowed — a guest just needs a real email in place
  // of an account, since there's no user.email to fall back to for order
  // contact/the post-purchase "save this order to an account" prompt (see
  // order-confirmation's page.tsx). guestEmail passing placeOrderSchema's
  // own .email() check above is necessary but not sufficient here: the
  // schema treats it as optional (it has no way to see session state),
  // so a signed-out submission with no email at all still needs this
  // explicit check.
  let guestEmail: string | null = null;
  if (!user) {
    if (!parsed.data.guestEmail) {
      return { success: false, error: t("guestEmailRequired") };
    }
    guestEmail = parsed.data.guestEmail;
  }

  // A saved address only ever makes sense for a signed-in caller — a
  // guest has no address book to reference, and CheckoutForm never
  // offers this shape to a signed-out visitor, but a tampered submission
  // could still send one.
  if (!user && "savedAddressId" in parsed.data.address) {
    return { success: false, error: t("invalidCheckoutDetails") };
  }

  // Resolve the shipping address snapshot up front (outside the
  // transaction — it's just a read/validate step).
  let shipping: {
    shippingName: string;
    shippingLine1: string;
    shippingLine2: string | null;
    shippingCity: string;
    shippingState: string | null;
    shippingPostalCode: string | null;
    shippingCountry: string | null;
    shippingPhone: string | null;
  };
  let newAddressToSave: Prisma.AddressCreateWithoutUserInput | null = null;

  if ("savedAddressId" in parsed.data.address) {
    // Guaranteed non-null here — the tampered-guest-submission case was
    // already rejected above.
    const saved = await db.address.findUnique({
      where: { id: parsed.data.address.savedAddressId },
    });
    if (!saved || saved.userId !== user!.id) {
      return { success: false, error: t("addressNotFound") };
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
      shippingPostalCode: a.postalCode ?? null,
      shippingCountry: a.country ?? null,
      shippingPhone: a.phone ?? null,
    };
    // Save it to the address book too, so it's selectable as a "saved
    // address" on the next order — there's no separate address-management
    // UI yet (Phase 3 scope is checkout, not account settings), so this is
    // the only way a saved address ever gets created. Guests have no
    // address book to save into (no account), so this only ever happens
    // for a signed-in caller.
    if (user) {
      const existingCount = await db.address.count({ where: { userId: user.id } });
      newAddressToSave = { ...a, isDefault: existingCount === 0 };
    }
  }

  // Reuses the same user-or-guest-cookie lookup the cart page/cart
  // actions already use, rather than a second, parallel cart query here.
  const cart = await getCurrentCart();

  if (!cart || cart.items.length === 0) {
    return { success: false, error: t("cartEmpty") };
  }

  let orderId: string;
  try {
    orderId = await db.$transaction(async (tx) => {
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];
      // Read fresh inside the transaction, same "never trust anything
      // computed before the transaction started" posture as the discount
      // code and delivery zone re-reads below — there's no counter to
      // race here, but staleness-tolerance stays consistent either way.
      const now = new Date();
      const sales = await tx.sale.findMany({ where: { isActive: true } });

      for (const item of cart.items) {
        if (item.product.status !== "active") {
          throw new OrderPlacementError(
            t("itemUnavailable", { title: item.product.title })
          );
        }

        const updateResult = await tx.productVariant.updateMany({
          where: { id: item.variantId, inventoryQuantity: { gte: item.quantity } },
          data: { inventoryQuantity: { decrement: item.quantity } },
        });
        if (updateResult.count === 0) {
          throw new OrderPlacementError(
            t("limitedStock", {
              title: item.product.title,
              size: item.variant.size,
              color: item.variant.color,
            })
          );
        }

        const originalEffective = effectivePriceCents(
          item.product.basePriceCents,
          item.variant.priceOverrideCents
        );
        const bestSale = getBestSaleForProduct(
          sales,
          {
            brandId: item.product.brandId,
            collectionIds: item.product.collections.map((c) => c.collectionId),
          },
          now
        );
        const { priceCents, compareAtCents } = getSaleAdjustedPriceCents(
          originalEffective,
          bestSale
        );

        orderItemsData.push({
          productId: item.productId,
          variantId: item.variantId,
          titleSnapshot: item.product.title,
          size: item.variant.size,
          color: item.variant.color,
          priceCents,
          compareAtPriceCentsSnapshot: compareAtCents,
          costCentsSnapshot: item.variant.costCents,
          quantity: item.quantity,
        });
      }

      const subtotalCents = calculateSubtotalCents(orderItemsData);

      // Discount, re-validated from scratch here rather than trusted from
      // whatever the cart page last showed — the same "never trust
      // pre-computed client/cart state" posture as everything else in
      // this transaction. See src/lib/discount.ts and
      // src/server/actions/discount.ts for why applying a code to the
      // cart never touches redemptionCount: this is the only place that
      // does, and it's the only place that has to.
      let discountCodeId: string | null = null;
      let discountCents = 0;
      let discountCodeSnapshot: string | null = null;
      let discountPercentSnapshot: number | null = null;

      if (cart.appliedDiscountCode) {
        const discount = await tx.discountCode.findUnique({
          where: { code: cart.appliedDiscountCode },
        });
        const result = validateDiscountCode(discount, subtotalCents, now);
        if (!result.valid) {
          throw new OrderPlacementError(t("discountInvalid"));
        }

        // Atomically reserve a redemption slot, same race-safe pattern as
        // the inventory decrement above: only succeeds while
        // redemptionCount is still under the limit (or unconditionally,
        // when there's no limit at all).
        const reserved = await tx.discountCode.updateMany({
          where: {
            id: discount!.id,
            ...(discount!.maxRedemptions != null
              ? { redemptionCount: { lt: discount!.maxRedemptions } }
              : {}),
          },
          data: { redemptionCount: { increment: 1 } },
        });
        if (reserved.count === 0) {
          throw new OrderPlacementError(t("discountRedemptionLimit"));
        }

        discountCodeId = discount!.id;
        discountCents = result.discountCents;
        discountCodeSnapshot = discount!.code;
        discountPercentSnapshot = discount!.percentOff;
      }

      // Delivery zone, re-read from the database inside the transaction
      // rather than trusted from the id alone — same "never trust
      // client-supplied prices" posture as everything else here. A zone
      // an admin has deactivated (or deleted) since the checkout page
      // loaded can no longer be selected, even if the client still sends
      // its id.
      const deliveryZone = await tx.deliveryZone.findUnique({
        where: { id: parsed.data.deliveryZoneId },
      });
      if (!deliveryZone || !deliveryZone.isActive) {
        throw new OrderPlacementError(t("deliveryZoneInvalid"));
      }

      if (newAddressToSave) {
        // Only ever set when user is signed in — see where it's built above.
        await tx.address.create({
          data: { ...newAddressToSave, userId: user!.id },
        });
      }

      let order: { id: string };
      try {
        order = await tx.order.create({
          data: {
            userId: user?.id ?? null,
            guestEmail,
            status: "pending",
            subtotalCents,
            discountCodeId,
            discountCents,
            discountCodeSnapshot,
            discountPercentSnapshot,
            deliveryZoneId: deliveryZone.id,
            deliveryZoneNameSnapshot: deliveryZone.name,
            deliveryFeeCents: deliveryZone.feeCents,
            localeSnapshot: locale,
            notes: parsed.data.notes ?? null,
            ...shipping,
            items: { createMany: { data: orderItemsData } },
          },
        });
      } catch (error) {
        // The (discountCodeId, userId) unique constraint — see
        // prisma/schema.prisma — is what actually enforces one redemption
        // per customer per code; this is where it surfaces.
        if (
          discountCodeId &&
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as Prisma.PrismaClientKnownRequestError).code === "P2002"
        ) {
          throw new OrderPlacementError(t("discountAlreadyUsed"));
        }
        throw error;
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { appliedDiscountCode: null },
      });

      return order.id;
    });
  } catch (error) {
    if (error instanceof OrderPlacementError) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  // Fired after the transaction has committed — re-fetched fresh rather
  // than threading transaction-local consts back out. sendEmailSafely
  // (src/server/email.ts) already never throws, but this is wrapped in its
  // own try/catch too, as defense in depth: nothing about this block may
  // ever roll back the already-placed order or block the redirect below.
  try {
    const createdOrder = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    const adminEmails = (
      await db.user.findMany({ where: { role: "admin" }, select: { email: true } })
    ).map((admin) => admin.email);
    if (createdOrder) {
      await sendAdminNewOrderEmail({
        order: createdOrder,
        adminEmails,
        customerName: user?.name ?? user?.email ?? guestEmail ?? "Guest",
        customerEmail: user?.email ?? guestEmail ?? "",
      });
    }
  } catch (error) {
    console.error("[order] Failed to send admin new-order email:", error);
  }

  revalidatePath("/cart");
  revalidatePath("/account");
  redirect(`/order-confirmation/${orderId}`);
}

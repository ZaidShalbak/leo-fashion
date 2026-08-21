"use client";

import { AnimatePresence, motion } from "motion/react";

import { CartLineItem, type CartLineItemData } from "./CartLineItem";

/**
 * Wraps the cart's item list in AnimatePresence so removing a line item
 * (see CartLineItem's handleRemove) collapses and fades out instead of
 * just vanishing when the server-revalidated item list comes back
 * without it. This has to be its own Client Component, not inline in the
 * (Server Component) cart page: AnimatePresence needs to own the
 * reconciliation of this children array — keyed by item.id — to notice a
 * key disappearing and delay the actual DOM removal for the exit
 * animation, regardless of whether the array changed because of local
 * state or, as here, a fresh server render. `layout` on each row makes
 * the remaining rows smoothly slide up to fill the gap as one exits,
 * instead of just snapping into their new position.
 */
export function CartItemList({ items }: { items: CartLineItemData[] }) {
  return (
    <div className="divide-border divide-y">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            // height: 0, not paddingTop/Bottom — CartLineItem's own py-4
            // padding lives inside this wrapper, so collapsing the
            // wrapper's height (with overflow: hidden below) clips that
            // padding away for free; the wrapper itself has none of its
            // own to animate.
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <CartLineItem item={item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

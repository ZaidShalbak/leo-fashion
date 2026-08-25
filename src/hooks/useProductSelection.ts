"use client";

import { useState } from "react";

/**
 * Checkbox-selection state shared between AdminProductsTable and
 * AdminProductsGrid — both views need the exact same "select all / select
 * one / is this one selected" behavior, so it's extracted here instead of
 * living in one component and being duplicated (or worse, subtly
 * diverging) in the other.
 */
export function useProductSelection(ids: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = ids.length > 0 && selectedIds.size === ids.length;
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(ids));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clear() {
    setSelectedIds(new Set());
  }

  return { selectedIds, allSelected, someSelected, toggleAll, toggleOne, clear };
}

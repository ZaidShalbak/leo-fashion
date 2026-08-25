"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reorderHeroBanners, deleteHeroBanner } from "@/server/actions/admin/heroBanners";
import { useConfirm } from "@/components/providers/ConfirmDialogProvider";

type HeroBannerRow = {
  id: string;
  imageUrl: string;
  headline: string | null;
  status: "live" | "scheduled" | "expired" | "inactive";
};

function sameOrder(a: HeroBannerRow[], b: HeroBannerRow[]): boolean {
  return a.length === b.length && a.every((item, index) => item.id === b[index]?.id);
}

/**
 * Drag-and-drop reordering via plain HTML5 drag events rather than a
 * library — with a handful of banners (this list is never going to be
 * long), hand-rolling it is simpler than adding a dependency for it, same
 * call HeroCarousel itself made about not pulling in a carousel library.
 *
 * Dragging only reorders the local working copy (`items`) — nothing is
 * persisted until "Save order" is clicked. Auto-saving on every drop was
 * the original behavior, but a stray/misclicked drag would silently commit
 * a homepage-visible change with no way back, so reordering now works like
 * every other admin form here: edit freely, then explicitly save (or
 * discard). `savedItems` tracks the last-persisted order so the Save/
 * Discard controls only show up once the working copy actually diverges
 * from it.
 */
export function HeroBannerReorderList({ banners }: { banners: HeroBannerRow[] }) {
  const confirm = useConfirm();
  const [items, setItems] = useState(banners);
  const [savedItems, setSavedItems] = useState(banners);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const draggedIndex = useRef<number | null>(null);

  const isDirty = !sameOrder(items, savedItems);

  function handleDragStart(index: number) {
    draggedIndex.current = index;
  }

  function handleDragOver(event: React.DragEvent, overIndex: number) {
    event.preventDefault();
    const fromIndex = draggedIndex.current;
    if (fromIndex === null || fromIndex === overIndex) return;

    setItems((current) => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(overIndex, 0, moved!);
      return next;
    });
    draggedIndex.current = overIndex;
  }

  function handleDrop() {
    draggedIndex.current = null;
  }

  function handleSaveOrder() {
    setError(null);
    startTransition(async () => {
      const result = await reorderHeroBanners({ orderedIds: items.map((b) => b.id) });
      if (result.success) {
        setSavedItems(items);
      } else {
        setError(result.error);
      }
    });
  }

  function handleDiscardOrder() {
    setError(null);
    setItems(savedItems);
  }

  async function handleDelete(id: string, headline: string | null) {
    const confirmed = await confirm({
      title: `Delete "${headline ?? "this banner"}"?`,
      description: "This can't be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteHeroBanner({ id });
      if (result.success) {
        // Deletion is still immediate/independent of the save-order flow —
        // drop the row from both copies so an in-progress unsaved reorder
        // doesn't suddenly reference a banner that's gone.
        setItems((current) => current.filter((b) => b.id !== id));
        setSavedItems((current) => current.filter((b) => b.id !== id));
      } else {
        setError(result.error);
      }
    });
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">No hero banners yet.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">Drag a banner to change its order on the homepage.</p>
        {isDirty && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Unsaved order</span>
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleDiscardOrder}>
              Discard
            </Button>
            <Button type="button" size="sm" disabled={isPending} onClick={handleSaveOrder}>
              {isPending ? "Saving…" : "Save order"}
            </Button>
          </div>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((banner, index) => (
          <li
            key={banner.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            className="border-border bg-background flex cursor-grab items-center gap-3 rounded-md border p-2 active:cursor-grabbing"
          >
            <span className="text-muted-foreground select-none" aria-hidden>
              ⠿
            </span>
            <div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded">
              <Image src={banner.imageUrl} alt="" fill sizes="56px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/hero-banners/${banner.id}/edit`}
                className="block truncate text-sm font-medium hover:underline"
              >
                {banner.headline ?? <span className="text-muted-foreground italic">No headline (image text only)</span>}
              </Link>
            </div>
            {banner.status === "live" && <Badge>Live</Badge>}
            {banner.status === "scheduled" && <Badge variant="secondary">Scheduled</Badge>}
            {banner.status === "expired" && <Badge variant="secondary">Expired</Badge>}
            {banner.status === "inactive" && <Badge variant="secondary">Inactive</Badge>}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleDelete(banner.id, banner.headline)}
              className="text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

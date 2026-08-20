"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reorderHeroBanners, deleteHeroBanner } from "@/server/actions/admin/heroBanners";

type HeroBannerRow = {
  id: string;
  imageUrl: string;
  headline: string;
  status: "live" | "scheduled" | "expired" | "inactive";
};

/**
 * Drag-and-drop reordering via plain HTML5 drag events rather than a
 * library — with a handful of banners (this list is never going to be
 * long), hand-rolling it is simpler than adding a dependency for it, same
 * call HeroCarousel itself made about not pulling in a carousel library.
 * Reorders the local list live as you drag over another card (so it feels
 * immediate), then persists the final order via reorderHeroBanners once
 * you drop — a `router.refresh()`-free approach since the local state
 * already reflects the new order and a refresh would just re-fetch the
 * same thing.
 */
export function HeroBannerReorderList({ banners }: { banners: HeroBannerRow[] }) {
  const [items, setItems] = useState(banners);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const draggedIndex = useRef<number | null>(null);

  function persistOrder(next: HeroBannerRow[]) {
    startTransition(async () => {
      const result = await reorderHeroBanners({ orderedIds: next.map((b) => b.id) });
      if (!result.success) setError(result.error);
    });
  }

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
    persistOrder(items);
  }

  function handleDelete(id: string, headline: string) {
    if (!window.confirm(`Delete "${headline}"? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteHeroBanner({ id });
      if (result.success) {
        setItems((current) => current.filter((b) => b.id !== id));
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
      <p className="text-muted-foreground text-xs">Drag a banner to change its order on the homepage.</p>
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
                {banner.headline}
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

"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon, ChevronRightIcon, XIcon, ZoomInIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Debounces wheel-driven navigation inside the zoomed lightbox — a single
// trackpad swipe fires many small wheel events, and without this a shopper
// scrolling once would fly past several images instead of moving one at a
// time.
const WHEEL_NAV_COOLDOWN_MS = 350;

export function ProductGallery({
  images,
  productTitle,
}: {
  images: { id: string; url: string; altText: string | null }[];
  productTitle: string;
}) {
  const t = useTranslations("ProductGallery");
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [hoverOrigin, setHoverOrigin] = useState<{ x: number; y: number } | null>(null);
  const lastWheelNavAt = useRef(0);
  const active = images[activeIndex];

  if (!active) {
    return (
      <div className="bg-muted aspect-[4/5] w-full rounded-lg" aria-hidden />
    );
  }

  function showNext() {
    setActiveIndex((i) => (i + 1) % images.length);
  }

  function showPrev() {
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  }

  function handleHoverMove(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverOrigin({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  function handleLightboxWheel(event: React.WheelEvent) {
    if (images.length <= 1) return;
    const now = Date.now();
    if (now - lastWheelNavAt.current < WHEEL_NAV_COOLDOWN_MS) return;
    lastWheelNavAt.current = now;
    if (event.deltaY > 0) showNext();
    else if (event.deltaY < 0) showPrev();
  }

  function handleLightboxKeyDown(event: React.KeyboardEvent) {
    if (images.length <= 1) return;
    if (event.key === "ArrowRight") showNext();
    else if (event.key === "ArrowLeft") showPrev();
  }

  return (
    <div data-slot="product-gallery">
      <button
        type="button"
        onClick={() => setZoomOpen(true)}
        onMouseMove={handleHoverMove}
        onMouseLeave={() => setHoverOrigin(null)}
        aria-label={t("zoomImage")}
        className="bg-muted group relative aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-lg"
      >
        <Image
          src={active.url}
          alt={active.altText ?? productTitle}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          style={
            hoverOrigin
              ? { transformOrigin: `${hoverOrigin.x}% ${hoverOrigin.y}%` }
              : undefined
          }
          className={cn(
            "object-cover transition-transform duration-300 ease-out",
            hoverOrigin && "scale-[2]"
          )}
        />
        <span className="bg-background/90 text-foreground absolute end-3 bottom-3 flex size-9 items-center justify-center rounded-full opacity-90 transition group-hover:opacity-100">
          <ZoomInIcon className="size-4.5" />
        </span>
      </button>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={t("showImage", { index: index + 1, total: images.length })}
              aria-current={index === activeIndex}
              className={cn(
                "bg-muted relative h-16 w-16 overflow-hidden rounded-md ring-offset-2 transition",
                index === activeIndex
                  ? "ring-ring ring-2"
                  : "opacity-70 hover:opacity-100"
              )}
            >
              <Image
                src={image.url}
                alt={image.altText ?? productTitle}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent
          showCloseButton={false}
          onWheel={handleLightboxWheel}
          onKeyDown={handleLightboxKeyDown}
          className="flex h-[90vh] max-h-[90vh] w-[95vw] max-w-4xl items-center justify-center border-none bg-transparent p-2 shadow-none sm:max-w-4xl"
        >
          <DialogTitle className="sr-only">
            {t("zoomedTitle", { title: productTitle })}
          </DialogTitle>
          {/* The default DialogClose is styled to sit on DialogContent's
              usual white bg-background — with that removed above (the
              photo itself should fill the dialog, not a white card behind
              it), its low-opacity icon had no contrast against arbitrary
              photo content. Same visible-circle treatment as the zoom
              trigger button instead. Clicking the semi-transparent overlay
              behind the dialog also closes it — Radix's DialogContent does
              that by default, nothing extra needed here. */}
          <DialogClose className="bg-background/90 text-foreground absolute end-3 top-3 z-10 flex size-9 items-center justify-center rounded-full transition hover:opacity-100">
            <XIcon className="size-4.5" />
            <span className="sr-only">{t("closeZoom")}</span>
          </DialogClose>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPrev}
                aria-label={t("previousImage")}
                className="bg-background/90 text-foreground absolute start-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full transition hover:opacity-100"
              >
                <ChevronLeftIcon className="size-5 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={showNext}
                aria-label={t("nextImage")}
                className="bg-background/90 text-foreground absolute end-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full transition hover:opacity-100"
              >
                <ChevronRightIcon className="size-5 rtl:rotate-180" />
              </button>
            </>
          )}
          <div className="relative h-full w-full">
            <Image
              key={active.id}
              src={active.url}
              alt={active.altText ?? productTitle}
              fill
              sizes="95vw"
              className="object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

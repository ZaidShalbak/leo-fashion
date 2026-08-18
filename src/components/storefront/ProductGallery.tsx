"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  productTitle,
}: {
  images: { id: string; url: string; altText: string | null }[];
  productTitle: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  if (!active) {
    return (
      <div className="bg-muted aspect-[4/5] w-full rounded-lg" aria-hidden />
    );
  }

  return (
    <div data-slot="product-gallery">
      <div className="bg-muted relative aspect-[4/5] w-full overflow-hidden rounded-lg">
        <Image
          src={active.url}
          alt={active.altText ?? productTitle}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
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
    </div>
  );
}

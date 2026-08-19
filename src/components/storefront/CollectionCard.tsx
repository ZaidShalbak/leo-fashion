import Image from "next/image";
import Link from "next/link";

import type { Collection } from "@prisma/client";

/**
 * Category tile — doubles as the homepage's "shop by category" section
 * (this app's Collection model is the closest thing to a product category;
 * see CLAUDE.md) and the collection page's own header link elsewhere.
 * Accepts an optional representative product image so tiles read as real
 * visual cards rather than plain text blocks.
 */
export function CollectionCard({
  collection,
  imageUrl,
  imageAlt,
}: {
  collection: Collection;
  imageUrl?: string | null;
  imageAlt?: string;
}) {
  return (
    <Link
      href={`/collections/${collection.handle}`}
      className="group border-border bg-card relative flex aspect-[3/2] flex-col justify-end overflow-hidden rounded-sm border p-6"
    >
      {imageUrl ? (
        <>
          <Image
            src={imageUrl}
            alt={imageAlt ?? collection.title}
            fill
            sizes="(min-width: 640px) 33vw, 100vw"
            className="object-cover opacity-90 grayscale-[15%] transition-transform duration-500 group-hover:scale-105"
          />
          {/* Fixed black gradient (not theme-driven) — this is purely for
              text legibility over a photo, so it should stay dark
              regardless of the site's light/dark palette. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        </>
      ) : (
        <div className="from-foreground/60 absolute inset-0 bg-gradient-to-t to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      )}
      <div className="relative">
        <h3
          className={
            imageUrl
              ? "font-serif text-lg text-white italic"
              : "font-serif text-lg italic"
          }
        >
          {collection.title}
        </h3>
        {collection.description && (
          <p className={imageUrl ? "mt-1 text-sm text-white/80" : "text-muted-foreground mt-1 text-sm"}>
            {collection.description}
          </p>
        )}
      </div>
    </Link>
  );
}

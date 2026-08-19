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
      className="group border-border bg-card relative flex aspect-[3/2] flex-col justify-end overflow-hidden rounded-lg border p-6"
    >
      {imageUrl ? (
        <>
          <Image
            src={imageUrl}
            alt={imageAlt ?? collection.title}
            fill
            sizes="(min-width: 640px) 33vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="from-foreground/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
        </>
      ) : (
        <div className="from-foreground/60 absolute inset-0 bg-gradient-to-t to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      )}
      <div className="relative">
        <h3 className={imageUrl ? "text-background text-lg font-semibold" : "text-lg font-semibold"}>
          {collection.title}
        </h3>
        {collection.description && (
          <p className={imageUrl ? "text-background/90 mt-1 text-sm" : "text-muted-foreground mt-1 text-sm"}>
            {collection.description}
          </p>
        )}
      </div>
    </Link>
  );
}

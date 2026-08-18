import Link from "next/link";

import type { Collection } from "@prisma/client";

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link
      href={`/collections/${collection.handle}`}
      className="group border-border bg-card relative flex aspect-[3/2] flex-col justify-end overflow-hidden rounded-lg border p-6"
    >
      <div className="from-foreground/60 absolute inset-0 bg-gradient-to-t to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <h3 className="text-lg font-semibold">{collection.title}</h3>
        {collection.description && (
          <p className="text-muted-foreground mt-1 text-sm">
            {collection.description}
          </p>
        )}
      </div>
    </Link>
  );
}

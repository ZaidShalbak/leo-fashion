import Link from "next/link";

import { db } from "@/server/db";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collections = await db.collection.findMany({
    orderBy: { title: "asc" },
  });

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Leo Fashion
          </Link>
          <nav className="flex gap-5 text-sm">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.handle}`}
                className="text-muted-foreground hover:text-foreground transition"
              >
                {collection.title}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-border text-muted-foreground border-t py-8 text-center text-sm">
        Leo Fashion — pay-on-delivery / invoice checkout, no card required.
      </footer>
    </div>
  );
}

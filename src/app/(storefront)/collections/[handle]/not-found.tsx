import Link from "next/link";

export default function CollectionNotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Collection not found</h1>
      <p className="text-muted-foreground mt-2">
        That collection doesn&apos;t exist or may have been removed.
      </p>
      <Link href="/" className="mt-6 inline-block underline">
        Back to homepage
      </Link>
    </div>
  );
}

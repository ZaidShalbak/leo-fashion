import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Product not found</h1>
      <p className="text-muted-foreground mt-2">
        That product doesn&apos;t exist, is no longer available, or the link
        may be wrong.
      </p>
      <Link href="/" className="mt-6 inline-block underline">
        Back to homepage
      </Link>
    </div>
  );
}

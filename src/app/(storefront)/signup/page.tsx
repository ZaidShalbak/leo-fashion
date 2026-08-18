import Link from "next/link";
import type { Metadata } from "next";

import { SignUpForm } from "@/components/storefront/SignUpForm";

export const metadata: Metadata = { title: "Create account" };

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const redirectTo = next && next.startsWith("/") ? next : "/";

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold tracking-tight">Create account</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Save addresses and track your orders.
      </p>

      <div className="mt-8">
        <SignUpForm redirectTo={redirectTo} />
      </div>

      <p className="text-muted-foreground mt-6 text-sm">
        Already have an account?{" "}
        <Link
          href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-foreground underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

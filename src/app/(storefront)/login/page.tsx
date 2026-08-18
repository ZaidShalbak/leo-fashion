import Link from "next/link";
import type { Metadata } from "next";

import { LoginForm } from "@/components/storefront/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const redirectTo = next && next.startsWith("/") ? next : "/";

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Welcome back to Leo Fashion.
      </p>

      <div className="mt-8">
        <LoginForm redirectTo={redirectTo} />
      </div>

      <p className="text-muted-foreground mt-6 text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-foreground underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

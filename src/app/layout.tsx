import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Uses the `geist` package's bundled font files (next/font/local under the
// hood) instead of next/font/google, since fonts.googleapis.com isn't
// reachable from this sandbox's network allowlist. Same typeface, no
// build-time network fetch. Swap back to next/font/google if/when that
// domain is allowed and self-hosting isn't preferred.

export const metadata: Metadata = {
  title: {
    default: "Leo Fashion",
    template: "%s — Leo Fashion",
  },
  description: "Leo Fashion — clothing, browsed and ordered online.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

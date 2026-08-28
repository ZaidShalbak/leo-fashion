import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Actions default to a 1MB request body limit. Product image
      // uploads (src/server/actions/admin/images.ts) are capped at 5MB
      // themselves; this needs to be a bit higher than that to leave room
      // for multipart/form-data overhead, or a real photo gets rejected by
      // Next.js before our own size check ever runs.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      {
        // Supabase Storage public bucket URLs, e.g.
        // https://<project-ref>.supabase.co/storage/v1/object/public/products/...
        // Inactive locally (seed data uses local /public/products SVGs
        // instead), but set up now so swapping in real product photos
        // later needs no next.config.ts change — see CLAUDE.md.
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Freely-licensed (Unsplash License) stock photography standing in
        // for real store-interior photography in the experimental
        // ScrollCarousel homepage section — see that file's comments. Swap
        // for real photos of the actual store whenever they exist, same
        // "placeholder now, real asset later" precedent as the brand logos
        // (Wikimedia) and product SVGs.
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default withNextIntl(nextConfig);

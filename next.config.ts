import type { NextConfig } from "next";

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
    ],
  },
};

export default nextConfig;

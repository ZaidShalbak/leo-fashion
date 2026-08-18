import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

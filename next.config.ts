import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The browser tests run their own dev server (test login, in-memory
  // database) in a separate folder, so it can run beside `npm run dev`:
  // Next.js allows one dev server per build folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

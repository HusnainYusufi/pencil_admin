import type { NextConfig } from "next";

/**
 * Cache Components are intentionally OFF: every console page is rendered
 * per request with the signed-in admin's token, and privileged data must
 * never be cached. Security headers + CSP are set per request in src/proxy.ts.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
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

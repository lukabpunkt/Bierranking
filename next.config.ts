import type { NextConfig } from "next";

// Cache Components bewusst aus: Die App ist komplett nutzerbezogen (Session-Cookies),
// klassisches dynamisches Rendering ist hier einfacher und robuster (siehe DECISIONS.md).
const nextConfig: NextConfig = {
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

import type { NextConfig } from "next";

// Statischer Export für GitHub Pages (kein Node-Server).
// NEXT_PUBLIC_BASE_PATH = Unterpfad der Pages-URL, z. B. "/Bierranking" (lokal leer).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
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

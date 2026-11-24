import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prost-Zeugnis",
    short_name: "Prost-Zeugnis",
    description: "Biere im Freundeskreis nach Schulnoten bewerten.",
    lang: "de",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFBF5",
    theme_color: "#F59E0B",
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: `${base}/icons/icon.svg`, sizes: "any", type: "image/svg+xml" },
    ],
  };
}

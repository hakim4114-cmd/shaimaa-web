import type { MetadataRoute } from "next";
import { brandBackgroundHex } from "@/lib/brand/icon";

// Makes Merchant OS installable on phones, tablets and computers
// ("Add to Home Screen" / "Install app"). Data is always live: no offline mode.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Merchant OS",
    short_name: "Merchant OS",
    description: "Operations for COD commerce — orders, stock, shipping and cash.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "ar",
    dir: "auto",
    background_color: brandBackgroundHex,
    theme_color: brandBackgroundHex,
    categories: ["business", "productivity"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}

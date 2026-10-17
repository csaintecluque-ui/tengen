import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

import pkg from "./package.json";

export default defineConfig({
  base: "/tengen/",
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "Tengen — apprendre le go",
        short_name: "Tengen",
        description: "Apprendre et jouer au go : parcours, problèmes, parties contre KataGo, analyse.",
        lang: "fr",
        start_url: "/tengen/",
        scope: "/tengen/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#11110F",
        theme_color: "#1B1512",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        globIgnores: ["**/ort/**", "**/models/**"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/models/") || url.pathname.includes("/ort/"),
            handler: "CacheFirst",
            options: { cacheName: "tengen-moteur", expiration: { maxEntries: 8 } }
          }
        ]
      }
    })
  ],
  worker: { format: "es" },
  build: { target: "es2022", chunkSizeWarningLimit: 1500 }
});

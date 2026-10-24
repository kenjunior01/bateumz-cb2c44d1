// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import { compression } from "vite-plugin-compression2";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  // Build id injectado no bundle — usado pelo self-heal para detectar deploys.
  // ⚠️ Em dev TEM de ser estável: um timestamp novo a cada load fazia o
  // self-heal entrar em LOOP de reloads (cada load via "novo deploy").
  define: {
    __BUILD_ID__: JSON.stringify(command === "build" ? new Date().toISOString() : "dev-stable"),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    watch: {
      // android/app (assets Capacitor gerados) tem milhares de ficheiros e
      // rebenta o limite de inotify watchers (ENOSPC) em dev
      ignored: ["**/android/**", "**/dist/**"],
    },
  },
  plugins: [
    react(),
    mcpPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      includeAssets: ["favicon.png", "robots.txt", "sitemap.xml"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        // Self-heal: SW novo assume o controlo imediatamente e caches
        // desactualadas são removidas automaticamente
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,webp}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ngxrdpplyghlugoowjqj\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|webp|gif)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      manifest: {
        name: "Bateu — Jogos, Sorteios ao Vivo, Alienação e Stories",
        short_name: "Bateu",
        description: "Plataforma líder em jogos online, sorteios ao vivo com prémios reais, alienação de bens (leasing, leilões, rent-to-own), stories sociais e torneios de esports. 12 países, 100% transparente.",
        theme_color: "#0a0a0f",
        background_color: "#0a0a0f",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        shortcuts: [
          {
            name: "Alienação de Bens",
            short_name: "Alienação",
            description: "Viaturas, imóveis e equipamentos em leasing, leilão e rent-to-own",
            url: "/alienacao",
          },
          {
            name: "Stories",
            short_name: "Stories",
            description: "Veja os stories mais recentes da comunidade",
            url: "/",
          },
        ],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
    // Gzip + Brotli compression for production
    compression({
      algorithm: "gzip",
      threshold: 1024,
    }),
    compression({
      algorithm: "brotliCompress",
      threshold: 1024,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        // SAFETY: keep ALL node_modules in ONE vendor chunk.
        // Splitting react/react-dom/scheduler into separate chunks caused
        // TDZ crashes ("Cannot access 'p' before initialization") due to
        // module init order across chunk boundaries. One vendor chunk is
        // immune to cross-chunk cycles and still caches well.
        manualChunks(id) {
          if (id.includes("node_modules/")) {
            return "vendor";
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "framer-motion",
      "@supabase/supabase-js",
      "@tanstack/react-query",
      "recharts",
    ],
    esbuildOptions: {
      target: "es2020",
    },
  },
}));

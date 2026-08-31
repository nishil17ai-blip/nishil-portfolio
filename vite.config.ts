import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // In `npm run dev`, Vite only serves the frontend — it has no idea
    // how to run api/chat.js, which is why that request 404s. This
    // proxies /api/* to a plain Node server (see api-dev-server.mjs)
    // that runs the same handler locally, so `npm run dev` works
    // end-to-end without needing the Vercel CLI.
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  build: {
    target: "es2020",
    // No manualChunks on purpose. three.js is reachable only through the
    // dynamic import in LazyScene, so Rollup gives it its own chunk that
    // the entry HTML does not preload — which is the whole point.
    chunkSizeWarningLimit: 900,
  },
});
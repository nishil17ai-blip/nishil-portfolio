import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    // No manualChunks on purpose. three.js is reachable only through the
    // dynamic import in LazyScene, so Rollup gives it its own chunk that
    // the entry HTML does not preload — which is the whole point.
    chunkSizeWarningLimit: 900,
  },
});

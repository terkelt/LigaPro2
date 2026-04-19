import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: "./postcss.config.mjs",
  },
  // Tauri expects a fixed port during dev
  server: {
    port: 1420,
    strictPort: true,
  },
  // Tauri build output
  build: {
    target: "esnext",
    outDir: "dist",
  },
});

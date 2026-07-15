import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves project sites from /<repo-name>/, so the base path
// must match the repository name exactly. Update this if the repo is renamed.
export default defineConfig({
  base: "/cristian-gonzalez-portfolio/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    // Keep vendor code in its own chunk so app-code edits don't invalidate
    // the (larger, more stable) framework cache on repeat visits.
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});

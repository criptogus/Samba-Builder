import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // BrowserWindow loads preload.js; Forge 8 otherwise emits preload.cjs.
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
      },
    },
  },
});

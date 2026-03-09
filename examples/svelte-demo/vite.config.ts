import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  worker: {
    format: "es",
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
  optimizeDeps: {
    exclude: ["avoid-nodes-edge-svelte"],
  },
});

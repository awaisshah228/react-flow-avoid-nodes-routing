import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "resolve-collisions": "src/resolve-collisions.ts",
    },
    format: ["esm"],
    dts: true,
    sourcemap: false,
    external: ["svelte", "svelte/store", "@xyflow/svelte"],
    splitting: true,
    clean: true,
    minify: true,
  },
  // Worker entry
  {
    entry: {
      "workers/avoid-router.worker": "src/workers/avoid-router.worker.ts",
    },
    format: ["esm"],
    sourcemap: false,
    minify: true,
    external: ["libavoid-js"],
    splitting: false,
    clean: false,
  },
]);

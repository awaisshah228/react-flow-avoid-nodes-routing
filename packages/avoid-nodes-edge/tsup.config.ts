import { defineConfig } from "tsup";

export default defineConfig([
  // Main library entries (ESM + CJS + DTS)
  {
    entry: {
      index: "src/index.ts",
      edge: "src/AvoidNodesEdge.tsx",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: false,
    external: ["react", "react-dom", "@xyflow/react", "zustand"],
    splitting: true,
    clean: true,
    minify: true,
  },
  // Worker entry — compiled to JS, libavoid-js stays external (resolved by consumer's bundler)
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

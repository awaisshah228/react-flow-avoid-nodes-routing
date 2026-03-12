import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", "routing-worker": "src/routing-worker.ts" },
  format: ["esm"],
  dts: true,
  sourcemap: false,
  external: ["libavoid-js"],
  splitting: false,
  clean: true,
  minify: true,
  platform: "node",
  target: "node18",
});

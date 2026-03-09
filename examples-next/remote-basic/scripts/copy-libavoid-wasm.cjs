#!/usr/bin/env node
/**
 * Copy libavoid.wasm from node_modules to public/ so Vite can serve it.
 * Searches both local and hoisted (workspace root) node_modules.
 */

const fs = require("fs");
const path = require("path");

const candidates = [
  path.join(__dirname, "..", "node_modules", "libavoid-js", "dist", "libavoid.wasm"),
  path.join(__dirname, "..", "..", "..", "node_modules", "libavoid-js", "dist", "libavoid.wasm"),
];

const src = candidates.find((p) => fs.existsSync(p));
const dest = path.join(__dirname, "..", "public", "libavoid.wasm");

if (!src) {
  console.warn("[copy-libavoid-wasm] libavoid.wasm not found - run npm install");
  process.exit(0);
}

const publicDir = path.dirname(dest);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log("[copy-libavoid-wasm] Copied libavoid.wasm to public/");

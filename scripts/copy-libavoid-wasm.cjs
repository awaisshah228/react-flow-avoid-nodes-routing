#!/usr/bin/env node
/**
 * Copy libavoid.wasm from node_modules to public/ so Vite can serve it.
 * Runs automatically after npm install via postinstall.
 */

const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "libavoid-js", "dist", "libavoid.wasm");
const dest = path.join(__dirname, "..", "public", "libavoid.wasm");

if (!fs.existsSync(src)) {
  console.warn("[copy-libavoid-wasm] libavoid.wasm not found at", src, "- run npm install");
  process.exit(0);
}

const publicDir = path.dirname(dest);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log("[copy-libavoid-wasm] Copied libavoid.wasm to public/");

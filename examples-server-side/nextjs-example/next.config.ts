import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow WASM files to be loaded server-side
  serverExternalPackages: ["libavoid-js"],
};

export default nextConfig;

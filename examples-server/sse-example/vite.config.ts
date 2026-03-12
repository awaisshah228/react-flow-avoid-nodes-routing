import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom", "@xyflow/react", "zustand"],
  },
  server: {
    proxy: {
      "/api": "http://localhost:3002",
      "/sse": "http://localhost:3002",
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend talks to the backend at /api. In dev, Vite proxies those calls
// to the Express server so there are no CORS issues and a single origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
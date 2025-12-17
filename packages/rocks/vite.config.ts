import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { config as dotenvConfig } from "dotenv";
import { defineConfig } from "vite";

dotenvConfig({ path: path.resolve(__dirname, "../../.env") });
dotenvConfig({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    host: true,
  },
});

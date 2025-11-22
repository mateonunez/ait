import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "node:path";
import { readFileSync } from "node:fs";

function getHttpsOptions(): { key: Buffer; cert: Buffer } | null {
  // Use shared certificates from gateway package
  const gatewayCertDir = path.resolve(__dirname, "../gateway/certs");
  const keyPath = path.join(gatewayCertDir, "server.key");
  const certPath = path.join(gatewayCertDir, "server.crt");

  try {
    const key = readFileSync(keyPath);
    const cert = readFileSync(certPath);
    return { key, cert };
  } catch {
    return null;
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      include: ["path", "url"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: ["d3-sankey"],
    },
  },
  server: (() => {
    const httpsOptions = process.env.USE_HTTPS === "true" ? getHttpsOptions() : null;
    return {
      ...(httpsOptions ? { https: httpsOptions } : {}),
      port: Number(process.env.VITE_PORT) || 5173,
      host: true,
    };
  })(),
});

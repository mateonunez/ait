import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { readFileSync } from "node:fs";

function getHttpsOptions(): { key: Buffer; cert: Buffer } | null {
  // Try to use certificates from gateway package first
  const gatewayCertDir = path.resolve(__dirname, "../gateway/certs");
  const localCertDir = path.resolve(__dirname, "./certs");

  const certPaths = [
    { key: path.join(gatewayCertDir, "server.key"), cert: path.join(gatewayCertDir, "server.crt") },
    { key: path.join(localCertDir, "server.key"), cert: path.join(localCertDir, "server.crt") },
  ];

  for (const { key: keyPath, cert: certPath } of certPaths) {
    try {
      const key = readFileSync(keyPath);
      const cert = readFileSync(certPath);
      return { key, cert };
    } catch {
      // Try next path
    }
  }

  return null;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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

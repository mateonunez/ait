import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { config as dotenvConfig } from "dotenv";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { getGatewayUrl, getHttpsOptions, ngrokPlugin, normalizeDomain } from "./plugins";

dotenvConfig({ path: path.resolve(__dirname, "../../../.env") });
dotenvConfig({ path: path.resolve(__dirname, ".env") });

process.env.VITE_GOOGLE_TAG_MANAGER_ID = process.env.VITE_GOOGLE_TAG_MANAGER_ID || "";

const useNgrok = Boolean(process.env.NGROK_AUTH_TOKEN);
const ngrokDomain = process.env.NGROK_DOMAIN;
const gatewayPort = Number(process.env.APP_PORT) || 3000;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      include: ["path", "url", "process"],
    }),
    ngrokPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ait/ai-sdk": path.resolve(__dirname, "../../infrastructure/ai-sdk/src/index.ts"),
    },
  },
  build: {
    rollupOptions: {
      external: ["d3-sankey"],
    },
  },
  server: (() => {
    // Skip local HTTPS when ngrok is enabled (ngrok provides HTTPS on the public URL)
    const httpsOptions = !useNgrok && process.env.USE_HTTPS === "true" ? getHttpsOptions(__dirname) : null;

    // Allow ngrok domains when ngrok is enabled
    const allowedHosts: string[] = [];
    if (useNgrok) {
      allowedHosts.push(".ngrok-free.app", ".ngrok.io", ".ngrok-free.dev");
      if (ngrokDomain) {
        allowedHosts.push(normalizeDomain(ngrokDomain));
      }
    }

    const gatewayUrl = getGatewayUrl(__dirname, gatewayPort);

    return {
      ...(httpsOptions ? { https: httpsOptions } : {}),
      port: Number(process.env.VITE_PORT) || 5173,
      host: true,
      ...(allowedHosts.length > 0 ? { allowedHosts } : {}),
      proxy: {
        "/api": {
          target: gatewayUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    };
  })(),
});

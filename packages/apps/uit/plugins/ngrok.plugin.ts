import ngrok from "@ngrok/ngrok";
import type { Plugin } from "vite";
import { normalizeDomain } from "./utils";

export interface NgrokPluginOptions {
  authtoken?: string;
  domain?: string;
}

/**
 * Vite plugin that creates an ngrok tunnel when the dev server starts.
 * Provides a public HTTPS URL for OAuth callbacks and external access.
 */
export function ngrokPlugin(options: NgrokPluginOptions = {}): Plugin {
  let listener: ngrok.Listener | null = null;

  const authtoken = options.authtoken || process.env.NGROK_AUTH_TOKEN;
  const domain = options.domain || process.env.NGROK_DOMAIN;

  return {
    name: "vite-plugin-ngrok",
    apply: "serve",

    async configureServer(server) {
      if (!authtoken) {
        return;
      }

      server.httpServer?.once("listening", async () => {
        try {
          const address = server.httpServer?.address();
          const port = typeof address === "object" && address ? address.port : 5173;

          const config: ngrok.Config = {
            authtoken,
            addr: port,
          };

          if (domain) {
            config.domain = normalizeDomain(domain);
          }

          listener = await ngrok.forward(config);
          const url = listener.url();

          console.log("\n");
          console.log("🚀 Ngrok tunnel active:");
          console.log(`   ${url}`);
          console.log("\n");
          console.log(`   Frontend: ${url}/`);
          console.log(`   API:      ${url}/api/*`);
          console.log("\n");
          console.log("   Use this URL for OAuth redirect URIs");
          console.log("\n");
        } catch (err) {
          console.error("Failed to start ngrok tunnel:", err);
        }
      });

      const shutdown = async () => {
        if (listener) {
          await listener.close();
          listener = null;
        }
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    },
  };
}

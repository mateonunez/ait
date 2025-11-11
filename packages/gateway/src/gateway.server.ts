import type { FastifyInstance } from "fastify";
import { buildServer } from "./config/gateway.config";

import chatRoutes from "./routes/gateway.chat.routes";
import modelsRoutes from "./routes/gateway.models.routes";
import githubRoutes from "./routes/gateway.github.routes";
import linearRoutes from "./routes/gateway.linear.routes";
import spotifyRoutes from "./routes/gateway.spotify.routes";
import xRoutes from "./routes/gateway.x.routes";
import observabilityRoutes from "./routes/gateway.observability.routes";
import feedbackRoutes from "./routes/gateway.feedback.routes";

export async function startServer(port = 3000): Promise<FastifyInstance> {
  const server = buildServer();

  server.register(chatRoutes, { prefix: "/api/chat" });
  server.register(modelsRoutes, { prefix: "/api/models" });
  server.register(githubRoutes, { prefix: "/api/github" });
  server.register(linearRoutes, { prefix: "/api/linear" });
  server.register(spotifyRoutes, { prefix: "/api/spotify" });
  server.register(xRoutes, { prefix: "/api/x" });
  server.register(observabilityRoutes, { prefix: "/api/observability" });
  server.register(feedbackRoutes, { prefix: "/api/feedback" });

  try {
    await server.listen({ port });
    server.log.info(`Gateway running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  return server;
}

const PORT = Number(process.env.APP_PORT) || 3000;
startServer(PORT);

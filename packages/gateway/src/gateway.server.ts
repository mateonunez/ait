import "dotenv/config";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./config/gateway.config";
import chatRoutes from "./routes/gateway.chat.routes";
import discoveryRoutes from "./routes/gateway.discovery.routes";
import feedbackRoutes from "./routes/gateway.feedback.routes";
import githubRoutes from "./routes/gateway.github.routes";
import googleRoutes from "./routes/gateway.google.routes";
import insightsRoutes from "./routes/gateway.insights.routes";
import linearRoutes from "./routes/gateway.linear.routes";
import modelsRoutes from "./routes/gateway.models.routes";
import notionRoutes from "./routes/gateway.notion.routes";
import observabilityRoutes from "./routes/gateway.observability.routes";
import slackRoutes from "./routes/gateway.slack.routes";
import spotifyRoutes from "./routes/gateway.spotify.routes";
import suggestionsRoutes from "./routes/gateway.suggestions.routes";
import xRoutes from "./routes/gateway.x.routes";
import { initializeCacheProvider } from "./services/redis-cache.provider";

const redisUrl = process.env.REDIS_URL;

export async function startServer(port = 3000): Promise<FastifyInstance> {
  initializeCacheProvider(redisUrl);

  const server = buildServer();

  server.register(chatRoutes, { prefix: "/api/chat" });
  server.register(modelsRoutes, { prefix: "/api/models" });
  server.register(githubRoutes, { prefix: "/api/github" });
  server.register(linearRoutes, { prefix: "/api/linear" });
  server.register(spotifyRoutes, { prefix: "/api/spotify" });
  server.register(xRoutes, { prefix: "/api/x" });
  server.register(notionRoutes, { prefix: "/api/notion" });
  server.register(slackRoutes, { prefix: "/api/slack" });
  server.register(googleRoutes, { prefix: "/api/google" });
  server.register(observabilityRoutes, { prefix: "/api/observability" });
  server.register(feedbackRoutes, { prefix: "/api/feedback" });
  server.register(discoveryRoutes, { prefix: "/api/discovery" });
  server.register(insightsRoutes, { prefix: "/api/insights" });
  server.register(suggestionsRoutes, { prefix: "/api/suggestions" });

  try {
    await server.listen({ port, host: "0.0.0.0" });
    const protocol = (server.server as { key?: Buffer })?.key ? "https" : "http";
    server.log.info(`Gateway running on ${protocol}://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  return server;
}

const PORT = Number(process.env.APP_PORT) || 3000;
startServer(PORT);

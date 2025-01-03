import Fastify, { type FastifyInstance } from "fastify";
import githubRoutes from "./routes/connector.github.routes";
import spotifyRoutes from "./routes/connector.spotify.routes";

export function buildServer(): FastifyInstance {
  const server = Fastify({ logger: true, ignoreTrailingSlash: true });
  server.register(githubRoutes, { prefix: "/api/github" });
  server.register(spotifyRoutes, { prefix: "/api/spotify" });
  return server;
}

export async function startServer(port = 3000): Promise<FastifyInstance> {
  const server = buildServer();

  try {
    await server.listen({ port });
    server.log.info(`Server running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
  return server;
}

const PORT = Number(process.env.APP_PORT) || 3000;
startServer(PORT);

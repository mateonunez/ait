import Fastify, { type FastifyInstance } from "fastify";
import githubRoutes from "./routes/connector.github.routes";
import spotifyRoutes from "./routes/connector.spotify.routes";
import xRoutes from "./routes/connector.x.routes";
import fastifySecureSession from "@fastify/secure-session";
import { ait } from "@/shared/constants/ait.constant";
import { randomBytes } from "node:crypto";

export function buildServer(): FastifyInstance {
  const server = Fastify({
    logger: {
      level: "info",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    },
    ignoreTrailingSlash: true,
  });

  const salt = randomBytes(8).toString("hex");

  server.register(fastifySecureSession, {
    secret: process.env.SESSION_SECRET || ait,
    salt,
    cookieName: "session",
    cookie: {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  });

  server.register(githubRoutes, { prefix: "/api/github" });
  server.register(spotifyRoutes, { prefix: "/api/spotify" });
  server.register(xRoutes, { prefix: "/api/x" });

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

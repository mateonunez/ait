import Fastify, { type FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifySecureSession from "@fastify/secure-session";
import { randomBytes } from "node:crypto";
import { ait } from "@ait/connectors";

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

  // Enable CORS for frontend access
  server.register(fastifyCors, {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

  return server;
}

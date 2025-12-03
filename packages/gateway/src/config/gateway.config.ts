import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ait } from "@ait/connectors";
import fastifyCors from "@fastify/cors";
import fastifySecureSession from "@fastify/secure-session";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

function getHttpsOptions(): { key: Buffer; cert: Buffer } | null {
  const certDir = join(__dirname, "../../certs");
  const keyPath = join(certDir, "server.key");
  const certPath = join(certDir, "server.crt");

  try {
    const key = readFileSync(keyPath);
    const cert = readFileSync(certPath);
    return { key, cert };
  } catch (error) {
    return null;
  }
}

export function buildServer(): FastifyInstance {
  const httpsOptions = getHttpsOptions();
  const useHttps = process.env.USE_HTTPS === "true" && httpsOptions !== null;

  const serverOptions: FastifyServerOptions & { https?: { key: Buffer; cert: Buffer } } = {
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
  };

  if (useHttps) {
    serverOptions.https = httpsOptions;
  }

  const server = Fastify(serverOptions);

  // Enable CORS for frontend access (support both HTTP and HTTPS)
  const allowedOrigins = [
    "http://localhost:5173",
    "https://localhost:5173",
    "http://localhost:3000",
    "https://localhost:3000",
  ];

  // Add custom origins from environment if provided
  if (process.env.CORS_ORIGINS) {
    allowedOrigins.push(...process.env.CORS_ORIGINS.split(","));
  }

  server.register(fastifyCors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  const salt = randomBytes(8).toString("hex");

  // Enable secure cookies when using HTTPS or in production
  const useSecureCookies = useHttps || process.env.NODE_ENV === "production";

  server.register(fastifySecureSession, {
    secret: process.env.SESSION_SECRET || ait,
    salt,
    cookieName: "session",
    cookie: {
      path: "/",
      httpOnly: true,
      secure: useSecureCookies,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  });

  return server;
}

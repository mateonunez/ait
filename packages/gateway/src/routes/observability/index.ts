import type { FastifyInstance } from "fastify";
import healthRoutes from "./observability.health.routes";
import metricsRoutes from "./observability.metrics.routes";
import qualityRoutes from "./observability.quality.routes";
import statsRoutes from "./observability.stats.routes";

export default async function observabilityRoutes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes);
  await fastify.register(metricsRoutes);
  await fastify.register(qualityRoutes);
  await fastify.register(statsRoutes);
}

export * from "./observability.utils";

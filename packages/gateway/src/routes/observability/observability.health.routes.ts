import { getLangfuseProvider } from "@ait/ai-sdk";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAnalyticsService } from "../../services/analytics/analytics.service";

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const analytics = getAnalyticsService();
      const health = analytics.getHealthStatus();
      const langfuseProvider = getLangfuseProvider();

      const status = {
        status: health.healthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          analytics: "operational",
          telemetry: langfuseProvider?.isEnabled() ? "operational" : "disabled",
        },
        health: {
          healthy: health.healthy,
          issues: health.issues,
          metrics: {
            errorRate: `${health.metrics.errorRate.toFixed(2)}%`,
            p95Latency: `${(health.metrics.p95Latency / 1000).toFixed(2)}s`,
            throughput: `${health.metrics.throughput.toFixed(2)} req/s`,
            errorSpike: health.metrics.errorSpike,
          },
        },
      };

      const httpStatus = health.healthy ? 200 : 503;
      return reply.status(httpStatus).send(status);
    } catch (error: unknown) {
      fastify.log.error({ err: error }, "Health check failed");
      return reply.status(500).send({
        status: "error",
        message: error instanceof Error ? error.message : "Health check failed",
      });
    }
  });

  fastify.get("/system", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const memoryUsage = process.memoryUsage();

      return reply.send({
        timestamp: new Date().toISOString(),
        process: {
          uptime: `${(process.uptime() / 3600).toFixed(2)} hours`,
          uptimeSeconds: process.uptime(),
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        memory: {
          rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
        },
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, "Failed to get system info");
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to get system info",
      });
    }
  });
}

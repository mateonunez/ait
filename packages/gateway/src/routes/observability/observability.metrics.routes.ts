import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAnalyticsService } from "../../services/analytics/analytics.service";
import { parseWindowMs } from "./observability.utils";

export default async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/metrics",
    async (
      request: FastifyRequest<{
        Querystring: { window?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMs = parseWindowMs(request.query.window);
        const windowMinutes = windowMs / 60000;

        const analytics = getAnalyticsService();
        const summary = analytics.getSummary(windowMs);

        return reply.send({
          timestamp: new Date().toISOString(),
          window: `${windowMinutes} minutes`,
          performance: {
            latency: {
              p50: `${(summary.performance.latency.p50 / 1000).toFixed(2)}s`,
              p75: `${(summary.performance.latency.p75 / 1000).toFixed(2)}s`,
              p90: `${(summary.performance.latency.p90 / 1000).toFixed(2)}s`,
              p95: `${(summary.performance.latency.p95 / 1000).toFixed(2)}s`,
              p99: `${(summary.performance.latency.p99 / 1000).toFixed(2)}s`,
              mean: `${(summary.performance.latency.mean / 1000).toFixed(2)}s`,
              count: summary.performance.latency.count,
            },
            throughput: `${summary.performance.throughput.toFixed(2)} req/s`,
            errorRate: `${summary.performance.errorRate.toFixed(2)}%`,
            cacheHitRate: `${summary.performance.cacheHitRate.toFixed(2)}%`,
          },
          cost: {
            total: `$${summary.cost.totalCost.toFixed(4)}`,
            generation: `$${summary.cost.generationCost.toFixed(4)}`,
            embedding: `$${summary.cost.embeddingCost.toFixed(4)}`,
            tokens: {
              generation: summary.cost.generationTokens,
              embedding: summary.cost.embeddingTokens,
            },
          },
          errors: {
            retrySuccessRate: `${summary.retrySuccessRate.toFixed(2)}%`,
            byCategory: summary.errors.map((err) => ({
              category: err.category,
              count: err.count,
              percentage: `${err.percentage.toFixed(2)}%`,
              isRetryable: err.isRetryable,
              suggestedAction: err.suggestedAction,
            })),
            topErrors: summary.topErrors.map((err) => ({
              fingerprint: err.fingerprint,
              count: err.count,
              category: err.category,
              message: err.message,
            })),
          },
        });
      } catch (error: unknown) {
        fastify.log.error({ err: error }, "Failed to get metrics");
        return reply.status(500).send({
          error: error instanceof Error ? error.message : "Failed to get metrics",
        });
      }
    },
  );

  fastify.get(
    "/performance",
    async (
      request: FastifyRequest<{
        Querystring: { window?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMs = parseWindowMs(request.query.window);
        const windowMinutes = windowMs / 60000;

        const analytics = getAnalyticsService();
        const perfMetrics = analytics.getPerformanceMetrics();
        const snapshot = perfMetrics.getSnapshot(windowMs);

        return reply.send({
          timestamp: new Date().toISOString(),
          window: `${windowMinutes} minutes`,
          latency: {
            milliseconds: {
              p50: snapshot.latency.p50,
              p75: snapshot.latency.p75,
              p90: snapshot.latency.p90,
              p95: snapshot.latency.p95,
              p99: snapshot.latency.p99,
              min: snapshot.latency.min,
              max: snapshot.latency.max,
              mean: snapshot.latency.mean,
            },
            seconds: {
              p50: (snapshot.latency.p50 / 1000).toFixed(2),
              p75: (snapshot.latency.p75 / 1000).toFixed(2),
              p90: (snapshot.latency.p90 / 1000).toFixed(2),
              p95: (snapshot.latency.p95 / 1000).toFixed(2),
              p99: (snapshot.latency.p99 / 1000).toFixed(2),
              mean: (snapshot.latency.mean / 1000).toFixed(2),
            },
            count: snapshot.latency.count,
          },
          throughput: {
            requestsPerSecond: snapshot.throughput,
            requestsPerMinute: snapshot.throughput * 60,
          },
          errorRate: {
            percentage: snapshot.errorRate,
            totalRequests: perfMetrics.getTotalRequests(),
            successfulRequests: perfMetrics.getSuccessCount(),
            failedRequests: perfMetrics.getErrorCount(),
          },
          cache: {
            hitRate: snapshot.cacheHitRate,
          },
        });
      } catch (error: unknown) {
        fastify.log.error({ err: error }, "Failed to get performance metrics");
        return reply.status(500).send({
          error: error instanceof Error ? error.message : "Failed to get performance metrics",
        });
      }
    },
  );

  fastify.get("/cost", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const analytics = getAnalyticsService();
      const costTracking = analytics.getCostTracking();
      const costBreakdown = costTracking.getTotalCost();

      return reply.send({
        timestamp: new Date().toISOString(),
        cost: {
          total: {
            amount: costBreakdown.totalCost,
            formatted: `$${costBreakdown.totalCost.toFixed(4)}`,
            currency: costBreakdown.currency,
          },
          generation: {
            amount: costBreakdown.generationCost,
            formatted: `$${costBreakdown.generationCost.toFixed(4)}`,
            tokens: costBreakdown.generationTokens,
          },
          embedding: {
            amount: costBreakdown.embeddingCost,
            formatted: `$${costBreakdown.embeddingCost.toFixed(4)}`,
            tokens: costBreakdown.embeddingTokens,
          },
        },
        projections: {
          daily: {
            amount: costBreakdown.totalCost * ((24 * 60) / (process.uptime() / 60)),
            formatted: `$${(costBreakdown.totalCost * ((24 * 60) / (process.uptime() / 60))).toFixed(2)}`,
          },
          monthly: {
            amount: costBreakdown.totalCost * ((30 * 24 * 60) / (process.uptime() / 60)),
            formatted: `$${(costBreakdown.totalCost * ((30 * 24 * 60) / (process.uptime() / 60))).toFixed(2)}`,
          },
        },
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, "Failed to get cost metrics");
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to get cost metrics",
      });
    }
  });

  fastify.get(
    "/cache",
    async (
      request: FastifyRequest<{
        Querystring: { window?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMs = parseWindowMs(request.query.window);
        const windowMinutes = windowMs / 60000;

        const analytics = getAnalyticsService();
        const cacheAnalytics = analytics.getCacheAnalytics();

        const effectiveness = cacheAnalytics.getCacheEffectiveness(windowMs);
        const stats = cacheAnalytics.getCacheStats();
        const costSavings = cacheAnalytics.getCostSavings(windowMs);
        const queryPatterns = cacheAnalytics.getQueryPatterns(10, windowMs);
        const timeline = cacheAnalytics.getCacheHitTimeline(60 * 1000, windowMs);

        return reply.send({
          timestamp: new Date().toISOString(),
          window: `${windowMinutes} minutes`,
          effectiveness: {
            hitRate: `${effectiveness.hitRate.toFixed(1)}%`,
            totalHits: effectiveness.totalHits,
            totalMisses: effectiveness.totalMisses,
            avgLatencySaving: `${(effectiveness.avgLatencySavingMs / 1000).toFixed(2)}s`,
            totalLatencySaved: `${(effectiveness.totalLatencySavedMs / 1000).toFixed(2)}s`,
          },
          size: {
            entryCount: stats.entryCount,
            estimatedMemoryMB: stats.estimatedMemoryMB.toFixed(2),
            maxEntries: stats.maxEntries,
            evictionCount: stats.evictionCount,
          },
          costSavings: {
            embeddingsSaved: `$${costSavings.embeddingsSavedDollars.toFixed(4)}`,
            retrievalsSaved: costSavings.retrievalsSaved,
            estimatedSavingsPerDay: `$${costSavings.estimatedSavingsPerDay.toFixed(2)}`,
          },
          topQueries: queryPatterns.map((pattern) => ({
            query: pattern.query,
            hits: pattern.hits,
            avgDocuments: pattern.avgDocumentCount.toFixed(1),
            lastHit: new Date(pattern.lastHit).toISOString(),
          })),
          timeline: timeline.map((t) => ({
            timestamp: new Date(t.timestamp).toISOString(),
            hits: t.hits,
            misses: t.misses,
            hitRate: t.hits + t.misses > 0 ? `${((t.hits / (t.hits + t.misses)) * 100).toFixed(1)}%` : "0%",
          })),
        });
      } catch (error: unknown) {
        fastify.log.error({ err: error }, "Failed to get cache metrics");
        return reply.status(500).send({
          error: error instanceof Error ? error.message : "Failed to get cache metrics",
        });
      }
    },
  );

  fastify.get(
    "/errors",
    async (
      request: FastifyRequest<{
        Querystring: { window?: string; limit?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMs = parseWindowMs(request.query.window);
        const windowMinutes = windowMs / 60000;
        const limit = Number.parseInt(request.query.limit || "10", 10);

        const analytics = getAnalyticsService();
        const failureAnalysis = analytics.getFailureAnalysis();

        const errorsByCategory = failureAnalysis.getErrorStatsByCategory(windowMs);
        const topErrors = failureAnalysis.getTopErrors(limit, windowMs);
        const retrySuccessRate = failureAnalysis.getRetrySuccessRate(windowMs);
        const avgRetryAttempts = failureAnalysis.getAverageRetryAttempts(windowMs);
        const errorSpike = failureAnalysis.detectErrorSpikes();
        const timeline = failureAnalysis.getErrorTimeline(60 * 1000, windowMs); // 1-minute buckets

        return reply.send({
          timestamp: new Date().toISOString(),
          window: `${windowMinutes} minutes`,
          summary: {
            totalErrors: failureAnalysis.getTotalErrors(windowMs),
            retrySuccessRate: `${retrySuccessRate.toFixed(2)}%`,
            averageRetryAttempts: avgRetryAttempts.toFixed(2),
            errorSpike: errorSpike,
          },
          byCategory: errorsByCategory,
          topErrors: topErrors.map((err) => ({
            fingerprint: err.fingerprint,
            count: err.count,
            category: err.example.category,
            severity: err.example.severity,
            message: err.example.message,
            isRetryable: err.example.isRetryable,
            suggestedAction: err.example.suggestedAction,
          })),
          timeline: timeline.map((t) => ({
            timestamp: new Date(t.timestamp).toISOString(),
            count: t.count,
          })),
        });
      } catch (error: unknown) {
        fastify.log.error({ err: error }, "Failed to get error metrics");
        return reply.status(500).send({
          error: error instanceof Error ? error.message : "Failed to get error metrics",
        });
      }
    },
  );
}

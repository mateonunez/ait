import { getLangfuseProvider } from "@ait/ai-sdk";
import { getFeedbackService } from "@ait/store";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAnalyticsService } from "../../services/analytics/analytics.service";
import { getHealthStatus, parseWindowMs } from "./observability.utils";

export default async function statsRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/stats",
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
        const feedbackService = getFeedbackService();
        const langfuseProvider = getLangfuseProvider();

        // Get all metrics in parallel
        const [
          healthStatus,
          performanceSnapshot,
          costBreakdown,
          cacheEffectiveness,
          cacheStats,
          costSavings,
          queryPatterns,
          cacheTimeline,
          errorsByCategory,
          topErrorsRaw,
          retrySuccessRate,
          avgRetryAttempts,
          errorSpike,
          errorTimeline,
          feedbackStats,
          qualityTrend,
          problematicTraces,
          isDegrading,
        ] = await Promise.all([
          Promise.resolve(analytics.getHealthStatus()),
          Promise.resolve(analytics.getPerformanceMetrics().getSnapshot(windowMs)),
          Promise.resolve(analytics.getCostTracking().getTotalCost()),
          Promise.resolve(analytics.getCacheAnalytics().getCacheEffectiveness(windowMs)),
          Promise.resolve(analytics.getCacheAnalytics().getCacheStats()),
          Promise.resolve(analytics.getCacheAnalytics().getCostSavings(windowMs)),
          Promise.resolve(analytics.getCacheAnalytics().getQueryPatterns(10, windowMs)),
          Promise.resolve(analytics.getCacheAnalytics().getCacheHitTimeline(60 * 1000, windowMs)),
          Promise.resolve(analytics.getFailureAnalysis().getErrorStatsByCategory(windowMs)),
          Promise.resolve(analytics.getFailureAnalysis().getTopErrors(10, windowMs)),
          Promise.resolve(analytics.getFailureAnalysis().getRetrySuccessRate(windowMs)),
          Promise.resolve(analytics.getFailureAnalysis().getAverageRetryAttempts(windowMs)),
          Promise.resolve(analytics.getFailureAnalysis().detectErrorSpikes()),
          Promise.resolve(analytics.getFailureAnalysis().getErrorTimeline(60 * 1000, windowMs)),
          feedbackService.getFeedbackStats(windowMs),
          feedbackService.getQualityTrend(60 * 60 * 1000, windowMs),
          feedbackService.getProblematicTraces(10),
          feedbackService.isQualityDegrading(),
        ]);

        const memoryUsage = process.memoryUsage();

        // Build unified response
        return reply.send({
          timestamp: new Date().toISOString(),
          window: `${windowMinutes} minutes`,
          health: {
            status: healthStatus.healthy ? "healthy" : "degraded",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {
              analytics: "operational",
              telemetry: langfuseProvider?.isEnabled() ? "operational" : "disabled",
            },
            health: {
              healthy: healthStatus.healthy,
              issues: healthStatus.issues,
              metrics: {
                errorRate: `${healthStatus.metrics.errorRate.toFixed(2)}%`,
                p95Latency: `${(healthStatus.metrics.p95Latency / 1000).toFixed(2)}s`,
                throughput: `${healthStatus.metrics.throughput.toFixed(2)} req/s`,
                errorSpike: healthStatus.metrics.errorSpike,
              },
            },
          },
          performance: {
            timestamp: new Date().toISOString(),
            window: `${windowMinutes} minutes`,
            latency: {
              milliseconds: {
                p50: performanceSnapshot.latency.p50,
                p75: performanceSnapshot.latency.p75,
                p90: performanceSnapshot.latency.p90,
                p95: performanceSnapshot.latency.p95,
                p99: performanceSnapshot.latency.p99,
                min: performanceSnapshot.latency.min,
                max: performanceSnapshot.latency.max,
                mean: performanceSnapshot.latency.mean,
              },
              seconds: {
                p50: (performanceSnapshot.latency.p50 / 1000).toFixed(2),
                p75: (performanceSnapshot.latency.p75 / 1000).toFixed(2),
                p90: (performanceSnapshot.latency.p90 / 1000).toFixed(2),
                p95: (performanceSnapshot.latency.p95 / 1000).toFixed(2),
                p99: (performanceSnapshot.latency.p99 / 1000).toFixed(2),
                mean: (performanceSnapshot.latency.mean / 1000).toFixed(2),
              },
              count: performanceSnapshot.latency.count,
            },
            throughput: {
              requestsPerSecond: performanceSnapshot.throughput,
              requestsPerMinute: performanceSnapshot.throughput * 60,
            },
            errorRate: {
              percentage: performanceSnapshot.errorRate,
              totalRequests: analytics.getPerformanceMetrics().getTotalRequests(),
              successfulRequests: analytics.getPerformanceMetrics().getSuccessCount(),
              failedRequests: analytics.getPerformanceMetrics().getErrorCount(),
            },
            cache: {
              hitRate: performanceSnapshot.cacheHitRate,
            },
          },
          cache: {
            timestamp: new Date().toISOString(),
            window: `${windowMinutes} minutes`,
            effectiveness: {
              hitRate: `${cacheEffectiveness.hitRate.toFixed(1)}%`,
              totalHits: cacheEffectiveness.totalHits,
              totalMisses: cacheEffectiveness.totalMisses,
              avgLatencySaving: `${(cacheEffectiveness.avgLatencySavingMs / 1000).toFixed(2)}s`,
              totalLatencySaved: `${(cacheEffectiveness.totalLatencySavedMs / 1000).toFixed(2)}s`,
            },
            size: {
              entryCount: cacheStats.entryCount,
              estimatedMemoryMB: cacheStats.estimatedMemoryMB.toFixed(2),
              maxEntries: cacheStats.maxEntries,
              evictionCount: cacheStats.evictionCount,
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
            timeline: cacheTimeline.map((t) => ({
              timestamp: new Date(t.timestamp).toISOString(),
              hits: t.hits,
              misses: t.misses,
              hitRate: t.hits + t.misses > 0 ? `${((t.hits / (t.hits + t.misses)) * 100).toFixed(1)}%` : "0%",
            })),
          },
          cost: {
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
          },
          errors: {
            timestamp: new Date().toISOString(),
            window: `${windowMinutes} minutes`,
            summary: {
              totalErrors: analytics.getFailureAnalysis().getTotalErrors(windowMs),
              retrySuccessRate: `${retrySuccessRate.toFixed(2)}%`,
              averageRetryAttempts: avgRetryAttempts.toFixed(2),
              errorSpike: errorSpike,
            },
            byCategory: errorsByCategory,
            topErrors: topErrorsRaw.map((err) => ({
              fingerprint: err.fingerprint,
              count: err.count,
              category: err.example.category,
              severity: err.example.severity,
              message: err.example.message,
              isRetryable: err.example.isRetryable,
              suggestedAction: err.example.suggestedAction,
            })),
            timeline: errorTimeline.map((t) => ({
              timestamp: new Date(t.timestamp).toISOString(),
              count: t.count,
            })),
          },
          quality: {
            timestamp: new Date().toISOString(),
            window: `${windowMinutes} minutes`,
            qualityScore: feedbackStats.qualityScore,
            feedback: {
              total: feedbackStats.total,
              thumbsUp: feedbackStats.thumbsUp,
              thumbsDown: feedbackStats.thumbsDown,
              neutral: feedbackStats.neutral,
              thumbsUpRate: `${feedbackStats.thumbsUpRate.toFixed(2)}%`,
            },
            health: {
              isDegrading,
              status: getHealthStatus(feedbackStats.qualityScore),
            },
            trend: qualityTrend.map((point) => ({
              timestamp: new Date(point.timestamp).toISOString(),
              score: point.score,
              totalFeedback: point.totalFeedback,
              thumbsUp: point.thumbsUpCount,
              thumbsDown: point.thumbsDownCount,
            })),
            problematicTraces: problematicTraces.map((trace) => ({
              traceId: trace.traceId,
              messageId: trace.messageId,
              rating: trace.rating,
              timestamp: new Date(trace.createdAt).toISOString(),
              comment: trace.comment,
              userId: trace.userId,
            })),
          },
          system: {
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
          },
        });
      } catch (error: unknown) {
        fastify.log.error({ err: error }, "Failed to get unified stats");
        return reply.status(500).send({
          error: error instanceof Error ? error.message : "Failed to get unified stats",
        });
      }
    },
  );
}

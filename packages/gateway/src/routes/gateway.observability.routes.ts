import { getAnalyticsService, getLangfuseProvider, getFeedbackService } from "@ait/ai-sdk";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Observability routes for health checks and metrics
 */
export default async function observabilityRoutes(fastify: FastifyInstance) {
  /**
   * Health check endpoint
   * GET /api/observability/health
   */
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
    } catch (error: any) {
      fastify.log.error({ err: error }, "Health check failed");
      return reply.status(500).send({
        status: "error",
        message: error.message || "Health check failed",
      });
    }
  });

  /**
   * Unified stats endpoint - Single source of truth for all observability metrics
   * GET /api/observability/stats
   * Query params:
   *  - window: time window in minutes (default: 60)
   */
  fastify.get(
    "/stats",
    async (
      request: FastifyRequest<{
        Querystring: { window?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMinutes = Number.parseInt(request.query.window || "60", 10);
        const windowMs = windowMinutes * 60 * 1000;

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
          Promise.resolve(feedbackService.getFeedbackStats(windowMs)),
          Promise.resolve(feedbackService.getQualityTrend(60 * 60 * 1000, windowMs)),
          Promise.resolve(feedbackService.getProblematicTraces(10)),
          Promise.resolve(feedbackService.isQualityDegrading()),
        ]);

        const memoryUsage = process.memoryUsage();

        // Determine quality health status
        const getQualityHealthStatus = (score: number): "excellent" | "good" | "fair" | "poor" => {
          if (score >= 85) return "excellent";
          if (score >= 70) return "good";
          if (score >= 50) return "fair";
          return "poor";
        };

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
              status: getQualityHealthStatus(feedbackStats.qualityScore),
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
              timestamp: new Date(trace.timestamp).toISOString(),
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
      } catch (error: any) {
        fastify.log.error({ err: error }, "Failed to get unified stats");
        return reply.status(500).send({
          error: error.message || "Failed to get unified stats",
        });
      }
    },
  );

  /**
   * Real-time metrics endpoint
   * GET /api/observability/metrics
   * Query params:
   *  - window: time window in minutes (default: 60)
   */
  fastify.get(
    "/metrics",
    async (
      request: FastifyRequest<{
        Querystring: { window?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMinutes = Number.parseInt(request.query.window || "60", 10);
        const windowMs = windowMinutes * 60 * 1000;

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
      } catch (error: any) {
        fastify.log.error({ err: error }, "Failed to get metrics");
        return reply.status(500).send({
          error: error.message || "Failed to get metrics",
        });
      }
    },
  );

  /**
   * Detailed performance metrics endpoint
   * GET /api/observability/performance
   */
  fastify.get(
    "/performance",
    async (
      request: FastifyRequest<{
        Querystring: { window?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMinutes = Number.parseInt(request.query.window || "60", 10);
        const windowMs = windowMinutes * 60 * 1000;

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
      } catch (error: any) {
        fastify.log.error({ err: error }, "Failed to get performance metrics");
        return reply.status(500).send({
          error: error.message || "Failed to get performance metrics",
        });
      }
    },
  );

  /**
   * Cost analysis endpoint
   * GET /api/observability/cost
   */
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
    } catch (error: any) {
      fastify.log.error({ err: error }, "Failed to get cost metrics");
      return reply.status(500).send({
        error: error.message || "Failed to get cost metrics",
      });
    }
  });

  /**
   * Cache analytics endpoint
   * GET /api/observability/cache
   * Query params:
   *  - window: time window in minutes (default: 60)
   */
  fastify.get(
    "/cache",
    async (
      request: FastifyRequest<{
        Querystring: { window?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMinutes = Number.parseInt(request.query.window || "60", 10);
        const windowMs = windowMinutes * 60 * 1000;

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
      } catch (error: any) {
        fastify.log.error({ err: error }, "Failed to get cache metrics");
        return reply.status(500).send({
          error: error.message || "Failed to get cache metrics",
        });
      }
    },
  );

  /**
   * Error analysis endpoint
   * GET /api/observability/errors
   */
  fastify.get(
    "/errors",
    async (
      request: FastifyRequest<{
        Querystring: { window?: string; limit?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMinutes = Number.parseInt(request.query.window || "60", 10);
        const windowMs = windowMinutes * 60 * 1000;
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
      } catch (error: any) {
        fastify.log.error({ err: error }, "Failed to get error metrics");
        return reply.status(500).send({
          error: error.message || "Failed to get error metrics",
        });
      }
    },
  );

  /**
   * System info endpoint
   * GET /api/observability/system
   */
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
    } catch (error: any) {
      fastify.log.error({ err: error }, "Failed to get system info");
      return reply.status(500).send({
        error: error.message || "Failed to get system info",
      });
    }
  });

  /**
   * Quality metrics endpoint (feedback-based)
   * GET /api/observability/quality
   * Query params:
   *  - window: time window in minutes (default: 60)
   */
  fastify.get(
    "/quality",
    async (
      request: FastifyRequest<{
        Querystring: { window?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMinutes = Number.parseInt(request.query.window || "60", 10);
        const windowMs = windowMinutes * 60 * 1000;

        const feedbackService = getFeedbackService();
        const stats = feedbackService.getFeedbackStats(windowMs);
        const trend = feedbackService.getQualityTrend(60 * 60 * 1000, windowMs); // 1-hour buckets
        const problematicTraces = feedbackService.getProblematicTraces(10);
        const isDegrading = feedbackService.isQualityDegrading();

        // Determine health status based on quality score
        const getHealthStatus = (score: number): "excellent" | "good" | "fair" | "poor" => {
          if (score >= 85) return "excellent";
          if (score >= 70) return "good";
          if (score >= 50) return "fair";
          return "poor";
        };

        return reply.send({
          timestamp: new Date().toISOString(),
          window: `${windowMinutes} minutes`,
          qualityScore: stats.qualityScore,
          feedback: {
            total: stats.total,
            thumbsUp: stats.thumbsUp,
            thumbsDown: stats.thumbsDown,
            neutral: stats.neutral,
            thumbsUpRate: `${stats.thumbsUpRate.toFixed(2)}%`,
          },
          health: {
            isDegrading,
            status: getHealthStatus(stats.qualityScore),
          },
          trend: trend.map((point) => ({
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
            timestamp: new Date(trace.timestamp).toISOString(),
            comment: trace.comment,
            userId: trace.userId,
          })),
        });
      } catch (error: any) {
        fastify.log.error({ err: error }, "Failed to get quality metrics");
        return reply.status(500).send({
          error: error.message || "Failed to get quality metrics",
        });
      }
    },
  );
}

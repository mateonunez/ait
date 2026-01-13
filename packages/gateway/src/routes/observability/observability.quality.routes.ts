import { getFeedbackService } from "@ait/store";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getHealthStatus, parseWindowMs } from "./observability.utils";

export default async function qualityRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/quality",
    async (
      request: FastifyRequest<{
        Querystring: { window?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMs = parseWindowMs(request.query.window);
        const windowMinutes = windowMs / 60000;

        const feedbackService = getFeedbackService();
        const stats = await feedbackService.getFeedbackStats(windowMs);
        const trend = await feedbackService.getQualityTrend(60 * 60 * 1000, windowMs); // 1-hour buckets
        const problematicTraces = await feedbackService.getProblematicTraces(10);
        const isDegrading = await feedbackService.isQualityDegrading();

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
            timestamp: new Date(trace.createdAt).toISOString(),
            comment: trace.comment,
            userId: trace.userId,
          })),
        });
      } catch (error: unknown) {
        fastify.log.error({ err: error }, "Failed to get quality metrics");
        return reply.status(500).send({
          error: error instanceof Error ? error.message : "Failed to get quality metrics",
        });
      }
    },
  );
}

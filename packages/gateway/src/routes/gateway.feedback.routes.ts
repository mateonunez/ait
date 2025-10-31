import { getFeedbackService } from "@ait/ai-sdk";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Feedback routes for collecting and analyzing user feedback
 */
export default async function feedbackRoutes(fastify: FastifyInstance) {
  /**
   * Submit feedback for a message
   * POST /api/feedback
   */
  fastify.post(
    "/",
    async (
      request: FastifyRequest<{
        Body: {
          messageId: string;
          traceId?: string;
          rating: "thumbs_up" | "thumbs_down" | "neutral";
          comment?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { messageId, traceId: providedTraceId, rating, comment } = request.body;

        // Validate required fields
        if (!messageId || !rating) {
          return reply.status(400).send({
            error: "Missing required fields: messageId, rating",
          });
        }

        // Validate rating
        if (!["thumbs_up", "thumbs_down", "neutral"].includes(rating)) {
          return reply.status(400).send({
            error: "Invalid rating. Must be: thumbs_up, thumbs_down, or neutral",
          });
        }

        // Extract user context from headers
        const userId = request.headers["x-user-id"] as string | undefined;
        const sessionId = request.headers["x-session-id"] as string | undefined;

        // Use provided traceId if available, otherwise try to look it up
        // In a production system, this would be stored in a database or cache
        let traceId = providedTraceId;

        if (!traceId) {
          traceId = (global as any).__messageToTraceMap?.[messageId];
        }

        if (!traceId) {
          console.warn("[Feedback] No trace found for messageId:", messageId);
          // Still record feedback even without trace for basic analytics
          traceId = `unknown-${messageId}`;
        }

        const feedbackService = getFeedbackService();
        const feedback = feedbackService.recordFeedback({
          traceId,
          messageId,
          rating,
          comment,
          userId,
          sessionId,
        });

        fastify.log.info({ feedbackId: feedback.feedbackId, rating, messageId }, "Feedback recorded");

        return reply.status(201).send({
          success: true,
          feedbackId: feedback.feedbackId,
          message: "Feedback recorded successfully",
        });
      } catch (error: any) {
        fastify.log.error({ err: error }, "Failed to record feedback");
        return reply.status(500).send({
          error: error.message || "Failed to record feedback",
        });
      }
    },
  );

  /**
   * Get feedback statistics
   * GET /api/feedback/stats?window=60
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

        const feedbackService = getFeedbackService();
        const stats = feedbackService.getFeedbackStats(windowMs);

        return reply.send({
          timestamp: new Date().toISOString(),
          window: `${windowMinutes} minutes`,
          stats: {
            total: stats.total,
            thumbsUp: stats.thumbsUp,
            thumbsDown: stats.thumbsDown,
            neutral: stats.neutral,
            thumbsUpRate: `${stats.thumbsUpRate.toFixed(1)}%`,
            qualityScore: stats.qualityScore.toFixed(1),
          },
        });
      } catch (error: any) {
        fastify.log.error({ err: error }, "Failed to get feedback stats");
        return reply.status(500).send({
          error: error.message || "Failed to get feedback stats",
        });
      }
    },
  );

  /**
   * Get problematic traces (negative feedback)
   * GET /api/feedback/problematic?limit=10&window=60
   */
  fastify.get(
    "/problematic",
    async (
      request: FastifyRequest<{
        Querystring: { limit?: string; window?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const limit = Number.parseInt(request.query.limit || "10", 10);
        const windowMinutes = Number.parseInt(request.query.window || "60", 10);
        const windowMs = windowMinutes * 60 * 1000;

        const feedbackService = getFeedbackService();
        const problematicTraces = feedbackService.getProblematicTraces(limit, windowMs);

        return reply.send({
          timestamp: new Date().toISOString(),
          window: `${windowMinutes} minutes`,
          count: problematicTraces.length,
          traces: problematicTraces.map((trace) => ({
            traceId: trace.traceId,
            messageId: trace.messageId,
            rating: trace.rating,
            comment: trace.comment,
            timestamp: new Date(trace.timestamp).toISOString(),
            userId: trace.userId,
            sessionId: trace.sessionId,
          })),
        });
      } catch (error: any) {
        fastify.log.error({ err: error }, "Failed to get problematic traces");
        return reply.status(500).send({
          error: error.message || "Failed to get problematic traces",
        });
      }
    },
  );

  /**
   * Get all feedback with optional filters
   * GET /api/feedback/all?window=60&rating=thumbs_up
   */
  fastify.get(
    "/all",
    async (
      request: FastifyRequest<{
        Querystring: {
          window?: string;
          rating?: "thumbs_up" | "thumbs_down" | "neutral";
          userId?: string;
          sessionId?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const windowMinutes = request.query.window ? Number.parseInt(request.query.window, 10) : undefined;
        const windowMs = windowMinutes ? windowMinutes * 60 * 1000 : undefined;

        const feedbackService = getFeedbackService();
        const allFeedback = feedbackService.getAllFeedback({
          windowMs,
          rating: request.query.rating,
          userId: request.query.userId,
          sessionId: request.query.sessionId,
        });

        return reply.send({
          timestamp: new Date().toISOString(),
          count: allFeedback.length,
          feedback: allFeedback.map((f) => ({
            feedbackId: f.feedbackId,
            traceId: f.traceId,
            messageId: f.messageId,
            rating: f.rating,
            comment: f.comment,
            timestamp: new Date(f.timestamp).toISOString(),
            userId: f.userId,
            sessionId: f.sessionId,
          })),
        });
      } catch (error: any) {
        fastify.log.error({ err: error }, "Failed to get all feedback");
        return reply.status(500).send({
          error: error.message || "Failed to get all feedback",
        });
      }
    },
  );
}

import { getFeedbackService } from "@ait/store";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

interface FeedbackBody {
  traceId?: string;
  messageId: string;
  rating: "thumbs_up" | "thumbs_down" | "neutral";
  comment?: string;
  userId?: string;
  sessionId?: string;
  metadata?: {
    messageLength?: number;
    hadToolCalls?: boolean;
    latencyMs?: number;
    model?: string;
    [key: string]: unknown;
  };
}

interface FeedbackStatsQuery {
  windowMs?: string;
}

interface FeedbackAllQuery {
  windowMs?: string;
  rating?: "thumbs_up" | "thumbs_down" | "neutral";
  userId?: string;
  sessionId?: string;
}

interface ProblematicQuery {
  limit?: string;
}

export default async function feedbackRoutes(fastify: FastifyInstance) {
  const feedbackService = getFeedbackService();

  fastify.post("/", async (request: FastifyRequest<{ Body: FeedbackBody }>, reply: FastifyReply) => {
    try {
      const { traceId, messageId, rating, comment, userId, sessionId, metadata } = request.body;

      if (!messageId || !rating) {
        return reply.status(400).send({
          error: "Missing required fields",
          message: "messageId and rating are required",
        });
      }

      const feedback = await feedbackService.recordFeedback({
        traceId: traceId || messageId, // fallback to messageId if traceId not provided
        messageId,
        rating,
        comment,
        userId,
        sessionId,
        metadata,
      });

      return reply.status(201).send({
        success: true,
        feedbackId: feedback.id,
        feedback,
      });
    } catch (error) {
      fastify.log.error(error, "[Feedback] Error recording feedback");
      return reply.status(500).send({
        error: "Internal server error",
        message: "Failed to record feedback",
      });
    }
  });

  fastify.get("/stats", async (request: FastifyRequest<{ Querystring: FeedbackStatsQuery }>, reply: FastifyReply) => {
    try {
      const windowMs = request.query.windowMs ? Number.parseInt(request.query.windowMs, 10) : undefined;

      const stats = await feedbackService.getFeedbackStats(windowMs);

      return reply.send({
        success: true,
        stats,
      });
    } catch (error) {
      fastify.log.error(error, "[Feedback] Error getting stats");
      return reply.status(500).send({
        error: "Internal server error",
        message: "Failed to get feedback stats",
      });
    }
  });

  fastify.get(
    "/problematic",
    async (request: FastifyRequest<{ Querystring: ProblematicQuery }>, reply: FastifyReply) => {
      try {
        const limit = request.query.limit ? Number.parseInt(request.query.limit, 10) : 10;

        const problematic = await feedbackService.getProblematicTraces(limit);

        return reply.send({
          success: true,
          count: problematic.length,
          traces: problematic,
        });
      } catch (error) {
        fastify.log.error(error, "[Feedback] Error getting problematic traces");
        return reply.status(500).send({
          error: "Internal server error",
          message: "Failed to get problematic traces",
        });
      }
    },
  );

  fastify.get("/all", async (request: FastifyRequest<{ Querystring: FeedbackAllQuery }>, reply: FastifyReply) => {
    try {
      const params = {
        windowMs: request.query.windowMs ? Number.parseInt(request.query.windowMs, 10) : undefined,
        rating: request.query.rating,
        userId: request.query.userId,
        sessionId: request.query.sessionId,
      };

      const feedback = await feedbackService.getAllFeedback(params);

      return reply.send({
        success: true,
        count: feedback.length,
        feedback,
      });
    } catch (error) {
      fastify.log.error(error, "[Feedback] Error getting all feedback");
      return reply.status(500).send({
        error: "Internal server error",
        message: "Failed to get feedback",
      });
    }
  });

  fastify.get("/trend", async (request: FastifyRequest<{ Querystring: FeedbackStatsQuery }>, reply: FastifyReply) => {
    try {
      const windowMs = request.query.windowMs ? Number.parseInt(request.query.windowMs, 10) : undefined;

      const trend = await feedbackService.getQualityTrend(undefined, windowMs);

      return reply.send({
        success: true,
        trend,
      });
    } catch (error) {
      fastify.log.error(error, "[Feedback] Error getting quality trend");
      return reply.status(500).send({
        error: "Internal server error",
        message: "Failed to get quality trend",
      });
    }
  });
}

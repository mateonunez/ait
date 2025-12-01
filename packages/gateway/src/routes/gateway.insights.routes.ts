import {
  type CreateGoalRequest,
  type IConnectorServiceFactory,
  type UpdateGoalRequest,
  createActivityAggregatorService,
  getInsightsService,
} from "@ait/ai-sdk";
import { getGoalTrackingService } from "@ait/ai-sdk";
import { connectorServiceFactory } from "@ait/connectors";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getRedisClient } from "../services/redis-cache.provider";

interface InsightsQuery {
  range?: "week" | "month" | "year";
}

interface GoalParams {
  id: string;
}

export default async function insightsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/insights/summary
   * Get AI-generated insights summary
   */
  fastify.get<{ Querystring: InsightsQuery }>(
    "/summary",
    async (request: FastifyRequest<{ Querystring: InsightsQuery }>, reply: FastifyReply) => {
      try {
        const range = request.query.range || "week";

        const activityAggregator = createActivityAggregatorService(
          connectorServiceFactory as unknown as IConnectorServiceFactory,
        );
        const activityData = await activityAggregator.fetchActivityData(range);
        const insightsService = getInsightsService();

        const insights = await insightsService.generateInsights(activityData, range);

        reply.send(insights);
      } catch (err: any) {
        fastify.log.error({ err, route: "/summary" }, "Failed to generate insights summary.");
        reply.status(500).send({ error: "Failed to generate insights summary." });
      }
    },
  );

  /**
   * GET /api/insights/correlations
   * Get cross-integration correlations
   */
  fastify.get<{ Querystring: InsightsQuery }>(
    "/correlations",
    async (request: FastifyRequest<{ Querystring: InsightsQuery }>, reply: FastifyReply) => {
      try {
        const range = request.query.range || "week";

        const activityAggregator = createActivityAggregatorService(
          connectorServiceFactory as unknown as IConnectorServiceFactory,
        );
        const activityData = await activityAggregator.fetchActivityData(range);
        const insightsService = getInsightsService();

        const insights = await insightsService.generateInsights(activityData, range);

        reply.send({ correlations: insights.correlations });
      } catch (err: any) {
        fastify.log.error({ err, route: "/correlations" }, "Failed to get correlations.");
        reply.status(500).send({ error: "Failed to get correlations." });
      }
    },
  );

  /**
   * GET /api/insights/anomalies
   * Get detected anomalies
   */
  fastify.get<{ Querystring: InsightsQuery }>(
    "/anomalies",
    async (request: FastifyRequest<{ Querystring: InsightsQuery }>, reply: FastifyReply) => {
      try {
        const range = request.query.range || "week";

        const activityAggregator = createActivityAggregatorService(
          connectorServiceFactory as unknown as IConnectorServiceFactory,
        );
        const activityData = await activityAggregator.fetchActivityData(range);
        const insightsService = getInsightsService();

        // For anomaly detection, we need historical data
        // For now, we'll pass empty array - in production you'd fetch historical periods
        const insights = await insightsService.generateInsights(activityData, range, []);

        reply.send({ anomalies: insights.anomalies });
      } catch (err: any) {
        fastify.log.error({ err, route: "/anomalies" }, "Failed to detect anomalies.");
        reply.status(500).send({ error: "Failed to detect anomalies." });
      }
    },
  );

  /**
   * GET /api/insights/recommendations
   * Get actionable recommendations
   */
  fastify.get<{ Querystring: InsightsQuery }>(
    "/recommendations",
    async (request: FastifyRequest<{ Querystring: InsightsQuery }>, reply: FastifyReply) => {
      try {
        const range = request.query.range || "week";

        const activityAggregator = createActivityAggregatorService(
          connectorServiceFactory as unknown as IConnectorServiceFactory,
        );
        const activityData = await activityAggregator.fetchActivityData(range);
        const insightsService = getInsightsService();

        const insights = await insightsService.generateInsights(activityData, range);

        reply.send({ recommendations: insights.recommendations });
      } catch (err: any) {
        fastify.log.error({ err, route: "/recommendations" }, "Failed to generate recommendations.");
        reply.status(500).send({ error: "Failed to generate recommendations." });
      }
    },
  );

  /**
   * POST /api/insights/goals
   * Create a new goal
   */
  fastify.post<{ Body: CreateGoalRequest }>(
    "/goals",
    async (request: FastifyRequest<{ Body: CreateGoalRequest }>, reply: FastifyReply) => {
      try {
        const redisClient = getRedisClient();
        const goalService = getGoalTrackingService(redisClient);

        const goal = await goalService.createGoal(request.body);

        reply.status(201).send(goal);
      } catch (err: any) {
        fastify.log.error({ err, route: "/goals [POST]" }, "Failed to create goal.");
        reply.status(500).send({ error: "Failed to create goal." });
      }
    },
  );

  /**
   * GET /api/insights/goals
   * Get all goals
   */
  fastify.get("/goals", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const redisClient = getRedisClient();
      const goalService = getGoalTrackingService(redisClient);

      const goals = await goalService.getGoals();

      // Update progress based on current activity
      const activityAggregator = createActivityAggregatorService(
        connectorServiceFactory as unknown as IConnectorServiceFactory,
      );
      const activityData = await activityAggregator.fetchActivityData("week");
      await goalService.updateAllProgress(activityData);

      // Fetch updated goals
      const updatedGoals = await goalService.getGoals();

      reply.send(updatedGoals);
    } catch (err: any) {
      fastify.log.error({ err, route: "/goals [GET]" }, "Failed to get goals.");
      reply.status(500).send({ error: "Failed to get goals." });
    }
  });

  /**
   * PATCH /api/insights/goals/:id
   * Update a goal
   */
  fastify.patch<{ Params: GoalParams; Body: UpdateGoalRequest }>(
    "/goals/:id",
    async (request: FastifyRequest<{ Params: GoalParams; Body: UpdateGoalRequest }>, reply: FastifyReply) => {
      try {
        const redisClient = getRedisClient();
        const goalService = getGoalTrackingService(redisClient);

        const goal = await goalService.updateGoal(request.params.id, request.body);

        if (!goal) {
          reply.status(404).send({ error: "Goal not found." });
          return;
        }

        reply.send(goal);
      } catch (err: any) {
        fastify.log.error({ err, route: "/goals/:id [PATCH]" }, "Failed to update goal.");
        reply.status(500).send({ error: "Failed to update goal." });
      }
    },
  );

  /**
   * DELETE /api/insights/goals/:id
   * Delete a goal
   */
  fastify.delete<{ Params: GoalParams }>(
    "/goals/:id",
    async (request: FastifyRequest<{ Params: GoalParams }>, reply: FastifyReply) => {
      try {
        const redisClient = getRedisClient();
        const goalService = getGoalTrackingService(redisClient);

        await goalService.deleteGoal(request.params.id);

        reply.status(204).send();
      } catch (err: any) {
        fastify.log.error({ err, route: "/goals/:id [DELETE]" }, "Failed to delete goal.");
        reply.status(500).send({ error: "Failed to delete goal." });
      }
    },
  );
}

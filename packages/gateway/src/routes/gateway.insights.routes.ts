import { connectorServiceFactory } from "@ait/connectors";
import type { CreateGoalRequest, UpdateGoalRequest } from "@ait/core";
import { getGoalService } from "@ait/store";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  type IConnectorServiceFactory,
  createActivityAggregatorService,
} from "../services/insights/activity-aggregator.service";
import { getInsightsService } from "../services/insights/insights.service";

const activityAggregator = createActivityAggregatorService(
  connectorServiceFactory as unknown as IConnectorServiceFactory,
);
const insightsService = getInsightsService();
const goalService = getGoalService();
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

        const activityData = await activityAggregator.fetchActivityData(range);
        const insightsService = getInsightsService();

        const insights = await insightsService.generateInsights(activityData, range);

        reply.send(insights);
      } catch (err: unknown) {
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
        const activityData = await activityAggregator.fetchActivityData(range);
        const insights = await insightsService.generateInsights(activityData, range);

        reply.send({ correlations: insights.correlations });
      } catch (err: unknown) {
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

        const [activityData, historicalData] = await Promise.all([
          activityAggregator.fetchActivityData(range),
          activityAggregator.fetchHistoricalData(range, "default", 4),
        ]);
        const insights = await insightsService.generateInsights(activityData, range, historicalData);

        reply.send({ anomalies: insights.anomalies });
      } catch (err: unknown) {
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

        const activityData = await activityAggregator.fetchActivityData(range);
        const insights = await insightsService.generateInsights(activityData, range);

        reply.send({ recommendations: insights.recommendations });
      } catch (err: unknown) {
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
        const goal = await goalService.createGoal("default", request.body);
        reply.status(201).send(goal);
      } catch (err: unknown) {
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
      const userId = "default";
      const activityData = await activityAggregator.fetchActivityData("week");
      await goalService.updateAllProgress(activityData, userId);
      const updatedGoals = await goalService.getGoals(userId);

      reply.send(updatedGoals);
    } catch (err: unknown) {
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
        const goal = await goalService.updateGoal(request.params.id, "default", request.body);
        if (!goal) {
          reply.status(404).send({ error: "Goal not found." });
          return;
        }

        reply.send(goal);
      } catch (err: unknown) {
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
        await goalService.deleteGoal(request.params.id, "default");
        reply.status(204).send();
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/goals/:id [DELETE]" }, "Failed to delete goal.");
        reply.status(500).send({ error: "Failed to delete goal." });
      }
    },
  );
}

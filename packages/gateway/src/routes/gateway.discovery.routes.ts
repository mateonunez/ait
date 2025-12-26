import { type IConnectorServiceFactory, createActivityAggregatorService } from "@ait/ai-sdk";
import { connectorServiceFactory } from "@ait/connectors";
import { getLogger } from "@ait/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const logger = getLogger();

interface TimeSeriesQuery {
  range?: "week" | "month" | "year";
}

interface DailyActivity {
  date: string;
  [integrationKey: string]: number | string;
}

interface DiscoveryStatsResponse {
  timeRange: "week" | "month" | "year";
  data: DailyActivity[];
  totals: Record<string, number>;
}

export default async function discoveryRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: TimeSeriesQuery }>(
    "/stats",
    async (request: FastifyRequest<{ Querystring: TimeSeriesQuery }>, reply: FastifyReply) => {
      try {
        const range = request.query.range || "week";

        // Use ActivityAggregatorService to fetch all integrations dynamically
        const activityAggregator = createActivityAggregatorService(
          connectorServiceFactory as unknown as IConnectorServiceFactory,
        );
        const activityData = await activityAggregator.fetchActivityData(range);

        // Get all integration keys
        const integrationKeys = Object.keys(activityData);

        // Build date set from all integrations
        const dateSet = new Set<string>();
        for (const integration of integrationKeys) {
          const activity = activityData[integration as keyof typeof activityData];
          if (activity?.daily) {
            for (const day of activity.daily) {
              dateSet.add(day.date);
            }
          }
        }

        // Sort dates
        const sortedDates = Array.from(dateSet).sort();

        // Build time series data
        const timeSeriesData: DailyActivity[] = sortedDates.map((date) => {
          const dayData: DailyActivity = { date };
          for (const integration of integrationKeys) {
            const activity = activityData[integration as keyof typeof activityData];
            if (activity?.daily) {
              const dayEntry = activity.daily.find((d) => d.date === date);
              dayData[integration] = dayEntry?.count || 0;
            } else {
              dayData[integration] = 0;
            }
          }
          return dayData;
        });

        // Calculate totals dynamically
        const totals: Record<string, number> = {};
        for (const integration of integrationKeys) {
          const activity = activityData[integration as keyof typeof activityData];
          totals[integration] = activity?.total || 0;
        }

        // Log summary for debugging
        logger.info("Discovery stats calculated", {
          range,
          totals,
          integrations: integrationKeys,
          emptyIntegrations: integrationKeys.filter((k) => totals[k] === 0),
        });

        const response: DiscoveryStatsResponse = {
          timeRange: range,
          data: timeSeriesData,
          totals,
        };

        reply.send(response);
      } catch (err: any) {
        fastify.log.error({ err, route: "/stats" }, "Failed to fetch discovery stats.");
        reply.status(500).send({ error: "Failed to fetch discovery stats." });
      }
    },
  );
}

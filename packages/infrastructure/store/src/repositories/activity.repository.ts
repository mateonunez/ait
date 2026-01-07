import {
  type ActivityData,
  ENTITY_METADATA,
  type EntityActivityBreakdown,
  type EntityType,
  type IntegrationActivity,
  type IntegrationVendor,
  SUPPORTED_VENDORS,
  getLogger,
} from "@ait/core";
import {
  drizzleOrm,
  getPostgresClient,
  githubCommits,
  githubPullRequests,
  githubRepositories,
  linearIssues,
  notionPages,
  slackMessages,
  spotifyRecentlyPlayed,
  xTweets,
} from "@ait/postgres";
import type { PgColumn, PgTableWithColumns } from "drizzle-orm/pg-core";

const logger = getLogger();
const pgClient = getPostgresClient();

export interface IActivityRepository {
  getActivityData(range: "week" | "month" | "year", userId: string): Promise<ActivityData>;
}

export class ActivityRepository implements IActivityRepository {
  async getActivityData(range: "week" | "month" | "year", userId: string): Promise<ActivityData> {
    const days = range === "week" ? 7 : range === "month" ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activityData: ActivityData = {};

    for (const vendor of SUPPORTED_VENDORS as unknown as IntegrationVendor[]) {
      try {
        activityData[vendor] = await this._getVendorActivity(vendor, startDate, userId);
      } catch (error) {
        logger.error(`[ActivityRepository] Failed to get activity for ${vendor}`, { error });
        activityData[vendor] = { total: 0, daily: [], byEntity: {} };
      }
    }

    return activityData;
  }

  private async _getVendorActivity(
    vendor: IntegrationVendor,
    startDate: Date,
    userId: string,
  ): Promise<IntegrationActivity> {
    const entities = Object.entries(ENTITY_METADATA)
      .filter(([_, meta]) => meta.vendor === vendor)
      .map(([type]) => type as EntityType);

    const byEntity: Record<string, EntityActivityBreakdown> = {};
    let grandTotal = 0;

    // Calculate number of days in range
    const diffTime = Math.abs(new Date().getTime() - startDate.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const dateRange = this._generateDateRange(days);

    const aggregatedDaily = new Map<string, number>();
    for (const date of dateRange) {
      aggregatedDaily.set(date, 0);
    }

    for (const entityType of entities) {
      const breakdown = await this._getEntityActivity(entityType, startDate, userId, dateRange);
      byEntity[entityType] = breakdown;
      grandTotal += breakdown.total;

      for (const { date, count } of breakdown.daily) {
        aggregatedDaily.set(date, (aggregatedDaily.get(date) || 0) + count);
      }
    }

    return {
      total: grandTotal,
      daily: Array.from(aggregatedDaily.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      byEntity,
    };
  }

  private _generateDateRange(days: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]!);
    }
    return dates;
  }

  private async _getEntityActivity(
    entityType: EntityType,
    startDate: Date,
    userId: string,
    dateRange: string[],
  ): Promise<EntityActivityBreakdown> {
    const tableInfo = this._getTableForEntity(entityType);
    if (!tableInfo) {
      return {
        total: 0,
        daily: dateRange.map((date) => ({ date, count: 0 })),
        displayName: ENTITY_METADATA[entityType].labelPlural,
      };
    }

    const { table, dateColumn } = tableInfo;

    const results = await pgClient.db
      .select({
        date: drizzleOrm.sql<string>`DATE_TRUNC('day', ${dateColumn})::date::text`,
        count: drizzleOrm.sql<number>`COUNT(*)::int`,
      })
      .from(table)
      .where(drizzleOrm.gte(dateColumn, startDate))
      .groupBy(drizzleOrm.sql`DATE_TRUNC('day', ${dateColumn})`)
      .execute();

    const dailyMap = new Map<string, number>();
    for (const date of dateRange) {
      dailyMap.set(date, 0);
    }

    for (const r of results) {
      if (dailyMap.has(r.date)) {
        dailyMap.set(r.date, r.count);
      }
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const total = daily.reduce((sum, d) => sum + d.count, 0);

    return {
      total,
      daily,
      displayName: ENTITY_METADATA[entityType].labelPlural,
    };
  }

  private _getTableForEntity(
    entityType: EntityType,
  ): { table: PgTableWithColumns<any>; dateColumn: PgColumn<any> } | null {
    switch (entityType) {
      case "github_repository":
        return { table: githubRepositories, dateColumn: githubRepositories.updatedAt };
      case "github_commit":
        return { table: githubCommits, dateColumn: githubCommits.committerDate };
      case "github_pull_request":
        return { table: githubPullRequests, dateColumn: githubPullRequests.prUpdatedAt };
      case "spotify_recently_played":
        return { table: spotifyRecentlyPlayed, dateColumn: spotifyRecentlyPlayed.playedAt };
      case "slack_message":
        return { table: slackMessages, dateColumn: slackMessages.createdAt };
      case "linear_issue":
        return { table: linearIssues, dateColumn: linearIssues.updatedAt };
      case "notion_page":
        return { table: notionPages, dateColumn: notionPages.updatedAt };
      case "x_tweet":
        return { table: xTweets, dateColumn: xTweets.createdAt };
      default:
        return null;
    }
  }
}

let instance: ActivityRepository | null = null;
export function getActivityRepository(): IActivityRepository {
  if (!instance) {
    instance = new ActivityRepository();
  }
  return instance;
}

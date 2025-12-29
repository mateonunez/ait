import { type EntityType, type FeedRequirement, type IntegrationEntity, getLogger } from "@ait/core";
import { drizzleOrm, getPostgresClient } from "@ait/postgres";
import * as postgresSchemas from "@ait/postgres";

const logger = getLogger();

export interface IFeedRepository {
  getBulkFeed(requirements: FeedRequirement[]): Promise<Map<string, IntegrationEntity[]>>;
}

export class FeedRepository implements IFeedRepository {
  async getBulkFeed(requirements: FeedRequirement[]): Promise<Map<string, IntegrationEntity[]>> {
    const results = new Map<string, IntegrationEntity[]>();

    // We execute these in parallel for maximum performance
    const promises = requirements.map(async (req) => {
      try {
        const data = await this._fetchEntityData(req.entityType, { limit: req.limit, page: 1 });
        results.set(req.entityType, data);
      } catch (error) {
        logger.error(`[FeedRepository] Failed to fetch feed for ${req.entityType}`, { error });
        results.set(req.entityType, []);
      }
    });

    await Promise.all(promises);
    return results;
  }

  private async _fetchEntityData(entityType: EntityType, params: any): Promise<IntegrationEntity[]> {
    const table = this._getTableForEntity(entityType);
    if (!table) return [];

    const limit = params.limit || 10;
    const offset = ((params.page || 1) - 1) * limit;

    // We need to determine the correct sort column for each entity
    const sortColumn = this._getSortColumnForEntity(entityType, table);

    const client = getPostgresClient();
    const rows = await client.db
      .select()
      .from(table)
      .orderBy(drizzleOrm.desc(sortColumn))
      .limit(limit)
      .offset(offset)
      .execute();

    // Add __type to each row for frontend identification
    return rows.map((row: any) => ({ ...row, __type: entityType }));
  }

  private _getTableForEntity(entityType: EntityType): any {
    const {
      githubRepositories,
      githubCommits,
      githubPullRequests,
      spotifyRecentlyPlayed,
      spotifyTracks,
      spotifyArtists,
      spotifyPlaylists,
      spotifyAlbums,
      slackMessages,
      linearIssues,
      notionPages,
      xTweets,
      googleCalendarEvents,
      googleCalendars,
      googleYouTubeSubscriptions,
      googleContacts,
      googlePhotos,
    } = postgresSchemas as any;

    switch (entityType) {
      case "github_repository":
        return githubRepositories;
      case "github_commit":
        return githubCommits;
      case "github_pull_request":
        return githubPullRequests;
      case "spotify_recently_played":
        return spotifyRecentlyPlayed;
      case "spotify_track":
        return spotifyTracks;
      case "spotify_artist":
        return spotifyArtists;
      case "spotify_playlist":
        return spotifyPlaylists;
      case "spotify_album":
        return spotifyAlbums;
      case "slack_message":
        return slackMessages;
      case "linear_issue":
        return linearIssues;
      case "notion_page":
        return notionPages;
      case "x_tweet":
        return xTweets;
      case "google_calendar_event":
        return googleCalendarEvents;
      case "google_calendar_calendar":
        return googleCalendars;
      case "google_youtube_subscription":
        return googleYouTubeSubscriptions;
      case "google_contact":
        return googleContacts;
      case "google_photo":
        return googlePhotos;
      default:
        return null;
    }
  }

  private _getSortColumnForEntity(entityType: EntityType, table: any): any {
    switch (entityType) {
      case "github_repository":
        return table.updatedAt;
      case "github_commit":
        return table.committerDate;
      case "github_pull_request":
        return table.prUpdatedAt;
      case "spotify_recently_played":
        return table.playedAt;
      case "slack_message":
        return table.createdAt;
      case "linear_issue":
        return table.updatedAt;
      case "notion_page":
        return table.updatedAt;
      case "x_tweet":
        return table.createdAt;
      case "google_calendar_event":
        return table.startTime;
      case "google_photo":
        return table.creationTime;
      default:
        // Fallback to createdAt or updatedAt if they exist
        return table.updatedAt || table.createdAt || table.id;
    }
  }
}

let instance: FeedRepository | null = null;

export function getFeedRepository(): IFeedRepository {
  if (!instance) {
    instance = new FeedRepository();
  }
  return instance;
}

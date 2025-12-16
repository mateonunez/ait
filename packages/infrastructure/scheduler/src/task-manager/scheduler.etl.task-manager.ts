import {
  runSpotifyTrackETL,
  runSpotifyArtistETL,
  runSpotifyPlaylistETL,
  runSpotifyAlbumETL,
  runSpotifyRecentlyPlayedETL,
  runGitHubRepositoryETL,
  runGitHubPullRequestETL,
  runGitHubCommitETL,
  runGitHubFileETL,
  runLinearETL,
  runXETL,
  SpotifyETLs,
  GitHubETLs,
  LinearETLs,
  XETLs,
  NotionETLs,
  SlackETLs,
  GoogleCalendarETLs,
  runNotionETL,
  runSlackETL,
  runGoogleCalendarEventETL,
  GoogleYouTubeETLs,
  runGoogleYouTubeSubscriptionETL,
} from "@ait/retove";
import { getLogger, RateLimitError } from "@ait/core";
import type { Scheduler } from "../scheduler.service";
import { getQdrantClient } from "@ait/qdrant";
import { getPostgresClient } from "@ait/postgres";
import { schedulerRegistry } from "../registry/scheduler.etl.registry";
import {
  ConnectorSpotifyService,
  ConnectorGitHubService,
  ConnectorLinearService,
  ConnectorXService,
  ConnectorNotionService,
  ConnectorSlackService,
  ConnectorGoogleService,
} from "@ait/connectors";
import {
  GITHUB_ENTITY_TYPES_ENUM,
  LINEAR_ENTITY_TYPES_ENUM,
  NOTION_ENTITY_TYPES_ENUM,
  SLACK_ENTITY_TYPES_ENUM,
  SPOTIFY_ENTITY_TYPES_ENUM,
  GOOGLE_ENTITY_TYPES_ENUM,
} from "@ait/connectors";

const logger = getLogger();

const logStart = (task: string) => logger.info(`⚙️ ${task}: Starting...`);
const logFetch = (task: string, msg: string) => logger.info(`   └─ [${task}] Fetching ${msg}`);
const logBatch = (task: string, count: number, entity: string, extra?: string) =>
  logger.info(`   └─ [${task}] Batch: ${count.toLocaleString()} ${entity}${extra ? ` (${extra})` : ""}`);
const logFetched = (task: string, count: number, entity: string) =>
  logger.info(`   └─ [${task}] Fetched: ${count.toLocaleString()} ${entity}`);
const logETL = (task: string) => logger.info(`   └─ [${task}] Running ETL to Qdrant...`);
const logComplete = (task: string) => logger.info(`✅ ${task}: Completed`);
const logRateLimit = (task: string, delay: number) =>
  logger.warn(`⏳ ${task}: Rate limit, rescheduling in ${Math.round(delay / 1000)}s...`);
const logError = (task: string, msg: string, error: any) => logger.error(`❌ ${task}: ${msg}`, error);

export interface ISchedulerETLTaskManager {
  registerTasks(): void;
  setScheduler(scheduler: Scheduler): void;
}

export class SchedulerETLTaskManager implements ISchedulerETLTaskManager {
  private readonly _spotifyService: ConnectorSpotifyService;
  private readonly _githubService: ConnectorGitHubService;
  private readonly _linearService: ConnectorLinearService;
  private readonly _xService: ConnectorXService;
  private readonly _notionService: ConnectorNotionService;
  private readonly _slackService: ConnectorSlackService;
  private readonly _googleService: ConnectorGoogleService;
  private _scheduler?: Scheduler;

  constructor() {
    this._spotifyService = new ConnectorSpotifyService();
    this._githubService = new ConnectorGitHubService();
    this._linearService = new ConnectorLinearService();
    this._xService = new ConnectorXService();
    this._notionService = new ConnectorNotionService();
    this._slackService = new ConnectorSlackService();
    this._googleService = new ConnectorGoogleService();
  }

  public setScheduler(scheduler: Scheduler): void {
    this._scheduler = scheduler;
  }

  public registerTasks(): void {
    // Register Spotify Track ETL
    schedulerRegistry.register(SpotifyETLs.track, async (data) => {
      logStart(SpotifyETLs.track);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logFetch(SpotifyETLs.track, "tracks from Spotify API");
        let totalFetched = 0;

        try {
          for await (const batch of this._spotifyService.fetchEntitiesPaginated(
            SPOTIFY_ENTITY_TYPES_ENUM.TRACK,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logBatch(SpotifyETLs.track, batch.length, "tracks");
            await this._spotifyService.connector.store.save(batch);
          }
          logFetched(SpotifyETLs.track, totalFetched, "tracks");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(SpotifyETLs.track, delay);
            await this._scheduler.addJob(SpotifyETLs.track, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logError(SpotifyETLs.track, "Error fetching tracks, proceeding to ETL", error);
        }

        logETL(SpotifyETLs.track);
        await runSpotifyTrackETL(qdrant, postgres);
        logComplete(SpotifyETLs.track);
      });
    });

    // Register Spotify Artist ETL
    schedulerRegistry.register(SpotifyETLs.artist, async (data) => {
      logStart(SpotifyETLs.artist);

      await this._withConnections(async ({ qdrant, postgres }) => {
        try {
          logFetch(SpotifyETLs.artist, "artists from Spotify API");
          const artists = await this._spotifyService.fetchArtists();
          logFetched(SpotifyETLs.artist, artists.length, "artists");

          logger.info("   └─ Saving artists to Postgres...");
          await this._spotifyService.connector.store.save(artists);
          logger.info("   └─ Saved to Postgres");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(SpotifyETLs.artist, delay);
            await this._scheduler.addJob(SpotifyETLs.artist, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logError(SpotifyETLs.artist, "Error fetching artists", error);
        }

        logETL(SpotifyETLs.artist);
        await runSpotifyArtistETL(qdrant, postgres);
        logComplete(SpotifyETLs.artist);
      });
    });

    // Register Spotify Playlist ETL
    schedulerRegistry.register(SpotifyETLs.playlist, async (data) => {
      logStart(SpotifyETLs.playlist);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logFetch(SpotifyETLs.playlist, "playlists from Spotify API");
        let totalFetched = 0;

        try {
          for await (const batch of this._spotifyService.fetchEntitiesPaginated(
            SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logBatch(SpotifyETLs.playlist, batch.length, "playlists");
            await this._spotifyService.connector.store.save(batch);
          }
          logFetched(SpotifyETLs.playlist, totalFetched, "playlists");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(SpotifyETLs.playlist, delay);
            await this._scheduler.addJob(SpotifyETLs.playlist, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logError(SpotifyETLs.playlist, "Error fetching playlists", error);
        }

        logETL(SpotifyETLs.playlist);
        await runSpotifyPlaylistETL(qdrant, postgres);
        logComplete(SpotifyETLs.playlist);
      });
    });

    // Register Spotify Album ETL
    schedulerRegistry.register(SpotifyETLs.album, async (data) => {
      logStart(SpotifyETLs.album);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logFetch(SpotifyETLs.album, "albums from Spotify API");
        let totalFetched = 0;

        try {
          for await (const batch of this._spotifyService.fetchEntitiesPaginated(
            SPOTIFY_ENTITY_TYPES_ENUM.ALBUM,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logBatch(SpotifyETLs.album, batch.length, "albums");
            await this._spotifyService.connector.store.save(batch);
          }
          logFetched(SpotifyETLs.album, totalFetched, "albums");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(SpotifyETLs.album, delay);
            await this._scheduler.addJob(SpotifyETLs.album, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logError(SpotifyETLs.album, "Error fetching albums", error);
        }

        logETL(SpotifyETLs.album);
        await runSpotifyAlbumETL(qdrant, postgres);
        logComplete(SpotifyETLs.album);
      });
    });

    // Register Spotify Recently Played ETL
    schedulerRegistry.register(SpotifyETLs.recentlyPlayed, async (data) => {
      logStart(SpotifyETLs.recentlyPlayed);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logFetch(SpotifyETLs.recentlyPlayed, "recently played from Spotify API");
        let totalFetched = 0;

        try {
          for await (const batch of this._spotifyService.fetchEntitiesPaginated(
            SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logBatch(SpotifyETLs.recentlyPlayed, batch.length, "items");
            await this._spotifyService.connector.store.save(batch);
          }
          logFetched(SpotifyETLs.recentlyPlayed, totalFetched, "items");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(SpotifyETLs.recentlyPlayed, delay);
            await this._scheduler.addJob(SpotifyETLs.recentlyPlayed, data as Record<string, unknown>, {
              delay,
              priority: 3,
            });
            return;
          }
          logError(SpotifyETLs.recentlyPlayed, "Error fetching recently played", error);
        }

        logETL(SpotifyETLs.recentlyPlayed);
        await runSpotifyRecentlyPlayedETL(qdrant, postgres);
        logComplete(SpotifyETLs.recentlyPlayed);
      });
    });

    // Register GitHub Repository ETL
    schedulerRegistry.register(GitHubETLs.repository, async (data) => {
      logStart(GitHubETLs.repository);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // 1. Fetch fresh data from GitHub API using pagination
        logFetch(GitHubETLs.repository, "repositories from GitHub API");
        let totalFetched = 0;
        let totalChanged = 0;

        for await (const batch of this._githubService.fetchEntitiesPaginated(
          GITHUB_ENTITY_TYPES_ENUM.REPOSITORY,
          true, // shouldConnect
        )) {
          totalFetched += batch.length;
          totalChanged += batch.length; // All yielded items are changed (checksum filtered)

          logBatch(
            GitHubETLs.repository,
            batch.length,
            "repositories",
            `Range: ${batch[0].fullName} ... ${batch[batch.length - 1].fullName}`,
          );

          // 2. Save batch to Postgres
          await this._githubService.connector.store.save(batch);
        }

        logFetched(GitHubETLs.repository, totalFetched, `repositories (${totalChanged} changed)`);

        // 3. Run ETL to Qdrant
        logETL(GitHubETLs.repository);
        await runGitHubRepositoryETL(qdrant, postgres);
        logComplete(GitHubETLs.repository);
      });
    });

    // Register GitHub Pull Request ETL
    schedulerRegistry.register(GitHubETLs.pullRequest, async (data) => {
      logStart(GitHubETLs.pullRequest);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // 1. Fetch fresh data from GitHub API (incremental)
        logFetch(GitHubETLs.pullRequest, "pull requests from GitHub API");
        let totalFetched = 0;

        try {
          for await (const batch of this._githubService.fetchEntitiesPaginated(
            GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logBatch(
              GitHubETLs.pullRequest,
              batch.length,
              "pull requests",
              `Repo: ${batch[0].repositoryFullName || "unknown"}`,
            );

            // 2. Save batch to Postgres
            await this._githubService.connector.store.save(batch);
          }
          logFetched(GitHubETLs.pullRequest, totalFetched, "pull requests");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(GitHubETLs.pullRequest, delay);
            await this._scheduler.addJob(GitHubETLs.pullRequest, data as Record<string, unknown>, {
              delay,
              priority: 3,
            });
            return;
          }
          logError(GitHubETLs.pullRequest, "Error fetching pull requests", error);
        }

        // 3. Run ETL to Qdrant
        logETL(GitHubETLs.pullRequest);
        await runGitHubPullRequestETL(qdrant, postgres);
        logComplete(GitHubETLs.pullRequest);
      });
    });

    // Register GitHub Commit ETL
    schedulerRegistry.register(GitHubETLs.commit, async (data) => {
      logStart(GitHubETLs.commit);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // 1. Fetch fresh data from GitHub API (incremental)
        logFetch(GitHubETLs.commit, "commits from GitHub API");
        let totalFetched = 0;

        try {
          for await (const batch of this._githubService.fetchEntitiesPaginated(
            GITHUB_ENTITY_TYPES_ENUM.COMMIT,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logBatch(GitHubETLs.commit, batch.length, "commits", `Repo: ${batch[0].repositoryFullName || "unknown"}`);

            // 2. Save batch to Postgres
            await this._githubService.connector.store.save(batch);
          }
          logFetched(GitHubETLs.commit, totalFetched, "commits");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(GitHubETLs.commit, delay);
            await this._scheduler.addJob(GitHubETLs.commit, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logError(GitHubETLs.commit, "Error fetching commits", error);
        }

        // 3. Run ETL to Qdrant
        logETL(GitHubETLs.commit);
        await runGitHubCommitETL(qdrant, postgres);
        logComplete(GitHubETLs.commit);
      });
    });

    schedulerRegistry.register(GitHubETLs.file, async (_data) => {
      logStart(GitHubETLs.file);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logger.info("   └─ Running ETL to Qdrant (vectorizing code files)...");
        await runGitHubFileETL(qdrant, postgres);
        logComplete(GitHubETLs.file);
      });
    });

    // Register Linear Issue ETL
    schedulerRegistry.register(LinearETLs.issue, async (data) => {
      logStart(LinearETLs.issue);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logFetch(LinearETLs.issue, "issues from Linear API");
        let totalFetched = 0;

        try {
          for await (const batch of this._linearService.fetchEntitiesPaginated(
            LINEAR_ENTITY_TYPES_ENUM.ISSUE,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logBatch(LinearETLs.issue, batch.length, "issues", `Team: ${batch[0].teamName || "unknown"}`);
            await this._linearService.connector.store.save(batch);
          }
          logFetched(LinearETLs.issue, totalFetched, "issues");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(LinearETLs.issue, delay);
            await this._scheduler.addJob(LinearETLs.issue, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logError(LinearETLs.issue, "Error fetching issues", error);
        }

        logETL(LinearETLs.issue);
        await runLinearETL(qdrant, postgres);
        logComplete(LinearETLs.issue);
      });
    });

    // Register X (Twitter) Tweet ETL
    schedulerRegistry.register(XETLs.tweet, async (data) => {
      logStart(XETLs.tweet);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // logger.info(`[${XETLs.tweet}] Fetching tweets from X API...`);
        // const tweets = await this._xService.fetchTweets();
        // logger.info(`[${XETLs.tweet}] Fetched ${tweets.length} tweets`);

        // logger.info(`[${XETLs.tweet}] Saving tweets to Postgres...`);
        // await this._xService.connector.store.save(tweets);
        // logger.info(`[${XETLs.tweet}] Saved to Postgres`);

        logETL(XETLs.tweet);
        await runXETL(qdrant, postgres);
        logComplete(XETLs.tweet);
      });
    });

    // Register Notion Page ETL
    schedulerRegistry.register(NotionETLs.page, async (data) => {
      logStart(NotionETLs.page);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logFetch(NotionETLs.page, "pages from Notion API");
        let totalFetched = 0;

        try {
          for await (const batch of this._notionService.fetchEntitiesPaginated(
            NOTION_ENTITY_TYPES_ENUM.PAGE,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logBatch(NotionETLs.page, batch.length, "pages");
            await this._notionService.connector.store.save(batch);
          }
          logFetched(NotionETLs.page, totalFetched, "pages");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(NotionETLs.page, delay);
            await this._scheduler.addJob(NotionETLs.page, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logError(NotionETLs.page, "Error fetching pages", error);
        }

        logETL(NotionETLs.page);
        await runNotionETL(qdrant, postgres);
        logComplete(NotionETLs.page);
      });
    });

    // Register Slack Message ETL
    schedulerRegistry.register(SlackETLs.message, async (data) => {
      logStart(SlackETLs.message);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logFetch(SlackETLs.message, "messages from Slack API");
        let totalFetched = 0;

        try {
          for await (const batch of this._slackService.fetchEntitiesPaginated(
            SLACK_ENTITY_TYPES_ENUM.MESSAGE,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logBatch(SlackETLs.message, batch.length, "messages", `Channel: ${batch[0].channelName || "unknown"}`);
            await this._slackService.connector.store.save(batch);
          }
          logFetched(SlackETLs.message, totalFetched, "messages");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(SlackETLs.message, delay);
            await this._scheduler.addJob(SlackETLs.message, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logError(SlackETLs.message, "Error fetching messages", error);
        }

        logETL(SlackETLs.message);
        await runSlackETL(qdrant, postgres);
        logComplete(SlackETLs.message);
      });
    });

    // Register Google Calendar Event ETL
    schedulerRegistry.register(GoogleCalendarETLs.event, async (data) => {
      logStart(GoogleCalendarETLs.event);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logFetch(GoogleCalendarETLs.event, "events from Google Calendar API");
        let totalFetched = 0;

        try {
          for await (const batch of this._googleService.fetchEntitiesPaginated(
            GOOGLE_ENTITY_TYPES_ENUM.EVENT,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logBatch(GoogleCalendarETLs.event, batch.length, "events", `First: ${batch[0].title || "untitled"}`);
            await this._googleService.connector.store.save(batch);
          }
          logFetched(GoogleCalendarETLs.event, totalFetched, "events");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(GoogleCalendarETLs.event, delay);
            await this._scheduler.addJob(GoogleCalendarETLs.event, data as Record<string, unknown>, {
              delay,
              priority: 2,
            });
            return;
          }
          logError(GoogleCalendarETLs.event, "Error fetching events", error);
        }

        logETL(GoogleCalendarETLs.event);
        await runGoogleCalendarEventETL(qdrant, postgres);
        logComplete(GoogleCalendarETLs.event);
      });
    });

    // Register Google YouTube Subscription ETL
    schedulerRegistry.register(GoogleYouTubeETLs.subscription, async (data) => {
      logStart(GoogleYouTubeETLs.subscription);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logFetch(GoogleYouTubeETLs.subscription, "subscriptions from YouTube API");
        let totalFetched = 0;

        try {
          for await (const batch of this._googleService.fetchEntitiesPaginated(
            GOOGLE_ENTITY_TYPES_ENUM.SUBSCRIPTION,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logBatch(
              GoogleYouTubeETLs.subscription,
              batch.length,
              "subscriptions",
              `First: ${batch[0].title || "untitled"}`,
            );
            await this._googleService.connector.store.save(batch);
          }
          logFetched(GoogleYouTubeETLs.subscription, totalFetched, "subscriptions");
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logRateLimit(GoogleYouTubeETLs.subscription, delay);
            await this._scheduler.addJob(GoogleYouTubeETLs.subscription, data as Record<string, unknown>, {
              delay,
              priority: 2,
            });
            return;
          }
          logError(GoogleYouTubeETLs.subscription, "Error fetching subscriptions", error);
        }

        logETL(GoogleYouTubeETLs.subscription);
        await runGoogleYouTubeSubscriptionETL(qdrant, postgres);
        logComplete(GoogleYouTubeETLs.subscription);
      });
    });
  }

  private async _withConnections<T>(
    operation: (clients: {
      qdrant: ReturnType<typeof getQdrantClient>;
      postgres: ReturnType<typeof getPostgresClient>;
    }) => Promise<T>,
  ): Promise<T> {
    const qdrantClient = getQdrantClient();
    const pgClient = getPostgresClient();

    return await operation({ qdrant: qdrantClient, postgres: pgClient });
  }
}

export const schedulerETLTaskManager = new SchedulerETLTaskManager();

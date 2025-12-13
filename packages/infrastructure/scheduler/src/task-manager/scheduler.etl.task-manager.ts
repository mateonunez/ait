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
      logger.info(`[${SpotifyETLs.track}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logger.info(`[${SpotifyETLs.track}] Fetching tracks from Spotify API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._spotifyService.fetchEntitiesPaginated(
            SPOTIFY_ENTITY_TYPES_ENUM.TRACK,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logger.info(`[${SpotifyETLs.track}] Processing batch of ${batch.length} tracks...`);
            await this._spotifyService.connector.store.save(batch);
          }
          logger.info(`[${SpotifyETLs.track}] Fetched ${totalFetched} tracks (changed only)`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${SpotifyETLs.track}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(SpotifyETLs.track, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logger.error(`[${SpotifyETLs.track}] Error fetching tracks (likely rate limit). Proceeding to ETL...`, error);
        }

        logger.info(`[${SpotifyETLs.track}] Running ETL to Qdrant...`);
        await runSpotifyTrackETL(qdrant, postgres);
        logger.info(`[${SpotifyETLs.track}] Completed`);
      });
    });

    // Register Spotify Artist ETL
    schedulerRegistry.register(SpotifyETLs.artist, async (data) => {
      logger.info(`[${SpotifyETLs.artist}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        try {
          logger.info(`[${SpotifyETLs.artist}] Fetching artists from Spotify API...`);
          const artists = await this._spotifyService.fetchArtists();
          logger.info(`[${SpotifyETLs.artist}] Fetched ${artists.length} artists`);

          logger.info(`[${SpotifyETLs.artist}] Saving artists to Postgres...`);
          await this._spotifyService.connector.store.save(artists);
          logger.info(`[${SpotifyETLs.artist}] Saved to Postgres`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${SpotifyETLs.artist}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(SpotifyETLs.artist, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logger.error(
            `[${SpotifyETLs.artist}] Error fetching artists (likely rate limit). Proceeding to ETL...`,
            error,
          );
        }

        logger.info(`[${SpotifyETLs.artist}] Running ETL to Qdrant...`);
        await runSpotifyArtistETL(qdrant, postgres);
        logger.info(`[${SpotifyETLs.artist}] Completed`);
      });
    });

    // Register Spotify Playlist ETL
    schedulerRegistry.register(SpotifyETLs.playlist, async (data) => {
      logger.info(`[${SpotifyETLs.playlist}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logger.info(`[${SpotifyETLs.playlist}] Fetching playlists from Spotify API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._spotifyService.fetchEntitiesPaginated(
            SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logger.info(`[${SpotifyETLs.playlist}] Processing batch of ${batch.length} playlists...`);
            await this._spotifyService.connector.store.save(batch);
          }
          logger.info(`[${SpotifyETLs.playlist}] Fetched ${totalFetched} playlists (changed only)`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${SpotifyETLs.playlist}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(SpotifyETLs.playlist, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logger.error(
            `[${SpotifyETLs.playlist}] Error fetching playlists (likely rate limit). Proceeding to ETL...`,
            error,
          );
        }

        logger.info(`[${SpotifyETLs.playlist}] Running ETL to Qdrant...`);
        await runSpotifyPlaylistETL(qdrant, postgres);
        logger.info(`[${SpotifyETLs.playlist}] Completed`);
      });
    });

    // Register Spotify Album ETL
    schedulerRegistry.register(SpotifyETLs.album, async (data) => {
      logger.info(`[${SpotifyETLs.album}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logger.info(`[${SpotifyETLs.album}] Fetching albums from Spotify API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._spotifyService.fetchEntitiesPaginated(
            SPOTIFY_ENTITY_TYPES_ENUM.ALBUM,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logger.info(`[${SpotifyETLs.album}] Processing batch of ${batch.length} albums...`);
            await this._spotifyService.connector.store.save(batch);
          }
          logger.info(`[${SpotifyETLs.album}] Fetched ${totalFetched} albums (changed only)`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${SpotifyETLs.album}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(SpotifyETLs.album, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logger.error(`[${SpotifyETLs.album}] Error fetching albums (likely rate limit). Proceeding to ETL...`, error);
        }

        logger.info(`[${SpotifyETLs.album}] Running ETL to Qdrant...`);
        await runSpotifyAlbumETL(qdrant, postgres);
        logger.info(`[${SpotifyETLs.album}] Completed`);
      });
    });

    // Register Spotify Recently Played ETL
    schedulerRegistry.register(SpotifyETLs.recentlyPlayed, async (data) => {
      logger.info(`[${SpotifyETLs.recentlyPlayed}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logger.info(`[${SpotifyETLs.recentlyPlayed}] Fetching recently played from Spotify API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._spotifyService.fetchEntitiesPaginated(
            SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logger.info(`[${SpotifyETLs.recentlyPlayed}] Processing batch of ${batch.length} items...`);
            await this._spotifyService.connector.store.save(batch);
          }
          logger.info(`[${SpotifyETLs.recentlyPlayed}] Fetched ${totalFetched} recently played items`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${SpotifyETLs.recentlyPlayed}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(SpotifyETLs.recentlyPlayed, data as Record<string, unknown>, {
              delay,
              priority: 3,
            });
            return;
          }
          logger.error(
            `[${SpotifyETLs.recentlyPlayed}] Error fetching recently played (likely rate limit). Proceeding to ETL...`,
            error,
          );
        }

        logger.info(`[${SpotifyETLs.recentlyPlayed}] Running ETL to Qdrant...`);
        await runSpotifyRecentlyPlayedETL(qdrant, postgres);
        logger.info(`[${SpotifyETLs.recentlyPlayed}] Completed`);
      });
    });

    // Register GitHub Repository ETL
    schedulerRegistry.register(GitHubETLs.repository, async (data) => {
      logger.info(`[${GitHubETLs.repository}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // 1. Fetch fresh data from GitHub API using pagination
        logger.info(`[${GitHubETLs.repository}] Fetching repositories from GitHub API (incremental)...`);
        let totalFetched = 0;
        let totalChanged = 0;

        for await (const batch of this._githubService.fetchEntitiesPaginated(
          GITHUB_ENTITY_TYPES_ENUM.REPOSITORY,
          true, // shouldConnect
        )) {
          totalFetched += batch.length;
          totalChanged += batch.length; // All yielded items are changed (checksum filtered)

          logger.info(
            `[${GitHubETLs.repository}] Processing batch of ${batch.length} repositories. Range: ${batch[0].fullName} ... ${
              batch[batch.length - 1].fullName
            }`,
          );

          // 2. Save batch to Postgres
          await this._githubService.connector.store.save(batch);
        }

        logger.info(`[${GitHubETLs.repository}] Fetched ${totalFetched} repositories (${totalChanged} changed)`);

        // 3. Run ETL to Qdrant
        logger.info(`[${GitHubETLs.repository}] Running ETL to Qdrant...`);
        await runGitHubRepositoryETL(qdrant, postgres);
        logger.info(`[${GitHubETLs.repository}] Completed`);
      });
    });

    // Register GitHub Pull Request ETL
    schedulerRegistry.register(GitHubETLs.pullRequest, async (data) => {
      logger.info(`[${GitHubETLs.pullRequest}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // 1. Fetch fresh data from GitHub API (incremental)
        logger.info(`[${GitHubETLs.pullRequest}] Fetching pull requests from GitHub API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._githubService.fetchEntitiesPaginated(
            GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logger.info(
              `[${GitHubETLs.pullRequest}] Processing batch of ${batch.length} pull requests for repo: ${
                batch[0].repositoryFullName || "unknown"
              }`,
            );

            // 2. Save batch to Postgres
            await this._githubService.connector.store.save(batch);
          }
          logger.info(`[${GitHubETLs.pullRequest}] Fetched ${totalFetched} pull requests`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${GitHubETLs.pullRequest}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(GitHubETLs.pullRequest, data as Record<string, unknown>, {
              delay,
              priority: 3,
            });
            return;
          }
          logger.error(
            `[${GitHubETLs.pullRequest}] Error fetching pull requests (likely rate limit). Proceeding to ETL...`,
            error,
          );
        }

        // 3. Run ETL to Qdrant
        logger.info(`[${GitHubETLs.pullRequest}] Running ETL to Qdrant...`);
        await runGitHubPullRequestETL(qdrant, postgres);
        logger.info(`[${GitHubETLs.pullRequest}] Completed`);
      });
    });

    // Register GitHub Commit ETL
    schedulerRegistry.register(GitHubETLs.commit, async (data) => {
      logger.info(`[${GitHubETLs.commit}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // 1. Fetch fresh data from GitHub API (incremental)
        logger.info(`[${GitHubETLs.commit}] Fetching commits from GitHub API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._githubService.fetchEntitiesPaginated(
            GITHUB_ENTITY_TYPES_ENUM.COMMIT,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logger.info(
              `[${GitHubETLs.commit}] Processing batch of ${batch.length} commits for repo: ${
                batch[0].repositoryFullName || "unknown"
              }`,
            );

            // 2. Save batch to Postgres
            await this._githubService.connector.store.save(batch);
          }
          logger.info(`[${GitHubETLs.commit}] Fetched ${totalFetched} commits`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${GitHubETLs.commit}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(GitHubETLs.commit, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logger.error(
            `[${GitHubETLs.commit}] Error fetching commits (likely rate limit). Proceeding to ETL...`,
            error,
          );
        }

        // 3. Run ETL to Qdrant
        logger.info(`[${GitHubETLs.commit}] Running ETL to Qdrant...`);
        await runGitHubCommitETL(qdrant, postgres);
        logger.info(`[${GitHubETLs.commit}] Completed`);
      });
    });

    schedulerRegistry.register(GitHubETLs.file, async (_data) => {
      logger.info(`[${GitHubETLs.file}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logger.info(`[${GitHubETLs.file}] Running ETL to Qdrant (vectorizing code files)...`);
        await runGitHubFileETL(qdrant, postgres);
        logger.info(`[${GitHubETLs.file}] Completed`);
      });
    });

    // Register Linear Issue ETL
    schedulerRegistry.register(LinearETLs.issue, async (data) => {
      logger.info(`[${LinearETLs.issue}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logger.info(`[${LinearETLs.issue}] Fetching issues from Linear API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._linearService.fetchEntitiesPaginated(
            LINEAR_ENTITY_TYPES_ENUM.ISSUE,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logger.info(
              `[${LinearETLs.issue}] Processing batch of ${batch.length} issues. Team: ${
                batch[0].teamName || "unknown"
              }`,
            );
            await this._linearService.connector.store.save(batch);
          }
          logger.info(`[${LinearETLs.issue}] Fetched ${totalFetched} issues (changed only)`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${LinearETLs.issue}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(LinearETLs.issue, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logger.error(`[${LinearETLs.issue}] Error fetching issues (likely rate limit). Proceeding to ETL...`, error);
        }

        logger.info(`[${LinearETLs.issue}] Running ETL to Qdrant...`);
        await runLinearETL(qdrant, postgres);
        logger.info(`[${LinearETLs.issue}] Completed`);
      });
    });

    // Register X (Twitter) Tweet ETL
    schedulerRegistry.register(XETLs.tweet, async (data) => {
      logger.info(`[${XETLs.tweet}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // logger.info(`[${XETLs.tweet}] Fetching tweets from X API...`);
        // const tweets = await this._xService.fetchTweets();
        // logger.info(`[${XETLs.tweet}] Fetched ${tweets.length} tweets`);

        // logger.info(`[${XETLs.tweet}] Saving tweets to Postgres...`);
        // await this._xService.connector.store.save(tweets);
        // logger.info(`[${XETLs.tweet}] Saved to Postgres`);

        logger.info(`[${XETLs.tweet}] Running ETL to Qdrant...`);
        await runXETL(qdrant, postgres);
        logger.info(`[${XETLs.tweet}] Completed`);
      });
    });

    // Register Notion Page ETL
    schedulerRegistry.register(NotionETLs.page, async (data) => {
      logger.info(`[${NotionETLs.page}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logger.info(`[${NotionETLs.page}] Fetching pages from Notion API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._notionService.fetchEntitiesPaginated(
            NOTION_ENTITY_TYPES_ENUM.PAGE,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logger.info(`[${NotionETLs.page}] Processing batch of ${batch.length} pages...`);
            await this._notionService.connector.store.save(batch);
          }
          logger.info(`[${NotionETLs.page}] Fetched ${totalFetched} pages (changed only)`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${NotionETLs.page}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(NotionETLs.page, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logger.error(`[${NotionETLs.page}] Error fetching pages (likely rate limit). Proceeding to ETL...`, error);
        }

        logger.info(`[${NotionETLs.page}] Running ETL to Qdrant...`);
        await runNotionETL(qdrant, postgres);
        logger.info(`[${NotionETLs.page}] Completed`);
      });
    });

    // Register Slack Message ETL
    schedulerRegistry.register(SlackETLs.message, async (data) => {
      logger.info(`[${SlackETLs.message}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logger.info(`[${SlackETLs.message}] Fetching messages from Slack API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._slackService.fetchEntitiesPaginated(
            SLACK_ENTITY_TYPES_ENUM.MESSAGE,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logger.info(
              `[${SlackETLs.message}] Processing batch of ${batch.length} messages in channel: ${
                batch[0].channelName || "unknown"
              }`,
            );
            await this._slackService.connector.store.save(batch);
          }
          logger.info(`[${SlackETLs.message}] Fetched ${totalFetched} messages (changed only)`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${SlackETLs.message}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(SlackETLs.message, data as Record<string, unknown>, { delay, priority: 3 });
            return;
          }
          logger.error(
            `[${SlackETLs.message}] Error fetching messages (likely rate limit). Proceeding to ETL...`,
            error,
          );
        }

        logger.info(`[${SlackETLs.message}] Running ETL to Qdrant...`);
        await runSlackETL(qdrant, postgres);
        logger.info(`[${SlackETLs.message}] Completed`);
      });
    });

    // Register Google Calendar Event ETL
    schedulerRegistry.register(GoogleCalendarETLs.event, async (data) => {
      logger.info(`[${GoogleCalendarETLs.event}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logger.info(`[${GoogleCalendarETLs.event}] Fetching events from Google Calendar API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._googleService.fetchEntitiesPaginated(
            GOOGLE_ENTITY_TYPES_ENUM.EVENT,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logger.info(
              `[${GoogleCalendarETLs.event}] Processing batch of ${batch.length} events. First: ${
                batch[0].title || "untitled"
              }`,
            );
            await this._googleService.connector.store.save(batch);
          }
          logger.info(`[${GoogleCalendarETLs.event}] Fetched ${totalFetched} events (changed only)`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${GoogleCalendarETLs.event}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(GoogleCalendarETLs.event, data as Record<string, unknown>, {
              delay,
              priority: 2,
            });
            return;
          }
          logger.error(
            `[${GoogleCalendarETLs.event}] Error fetching events (likely rate limit). Proceeding to ETL...`,
            error,
          );
        }

        logger.info(`[${GoogleCalendarETLs.event}] Running ETL to Qdrant...`);
        await runGoogleCalendarEventETL(qdrant, postgres);
        logger.info(`[${GoogleCalendarETLs.event}] Completed`);
      });
    });

    // Register Google YouTube Subscription ETL
    schedulerRegistry.register(GoogleYouTubeETLs.subscription, async (data) => {
      logger.info(`[${GoogleYouTubeETLs.subscription}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        logger.info(`[${GoogleYouTubeETLs.subscription}] Fetching subscriptions from YouTube API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._googleService.fetchEntitiesPaginated(
            GOOGLE_ENTITY_TYPES_ENUM.SUBSCRIPTION,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            logger.info(
              `[${GoogleYouTubeETLs.subscription}] Processing batch of ${batch.length} subscriptions. First: ${
                batch[0].title || "untitled"
              }`,
            );
            await this._googleService.connector.store.save(batch);
          }
          logger.info(`[${GoogleYouTubeETLs.subscription}] Fetched ${totalFetched} subscriptions (changed only)`);
        } catch (error: any) {
          if (error instanceof RateLimitError && this._scheduler) {
            const delay = Math.max(0, error.resetTime - Date.now());
            logger.warn(`[${GoogleYouTubeETLs.subscription}] Rate limit exceeded. Rescheduling in ${delay}ms...`);
            await this._scheduler.addJob(GoogleYouTubeETLs.subscription, data as Record<string, unknown>, {
              delay,
              priority: 2,
            });
            return;
          }
          logger.error(
            `[${GoogleYouTubeETLs.subscription}] Error fetching subscriptions (likely rate limit). Proceeding to ETL...`,
            error,
          );
        }

        logger.info(`[${GoogleYouTubeETLs.subscription}] Running ETL to Qdrant...`);
        await runGoogleYouTubeSubscriptionETL(qdrant, postgres);
        logger.info(`[${GoogleYouTubeETLs.subscription}] Completed`);
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

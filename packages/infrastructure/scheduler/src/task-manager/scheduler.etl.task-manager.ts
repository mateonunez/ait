import {
  runSpotifyTrackETL,
  runSpotifyArtistETL,
  runSpotifyPlaylistETL,
  runSpotifyAlbumETL,
  runSpotifyRecentlyPlayedETL,
  runGitHubRepositoryETL,
  runGitHubPullRequestETL,
  runGitHubCommitETL,
  runLinearETL,
  runXETL,
  SpotifyETLs,
  GitHubETLs,
  LinearETLs,
  XETLs,
  NotionETLs,
  SlackETLs,
  runNotionETL,
  runSlackETL,
} from "@ait/retove";
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
} from "@ait/connectors";
import { GITHUB_ENTITY_TYPES_ENUM, LINEAR_ENTITY_TYPES_ENUM, NOTION_ENTITY_TYPES_ENUM, SLACK_ENTITY_TYPES_ENUM, SPOTIFY_ENTITY_TYPES_ENUM } from "@ait/connectors/dist/src/services/vendors/connector.vendors.config";

export interface ISchedulerETLTaskManager {
  registerTasks(): void;
}

export class SchedulerETLTaskManager implements ISchedulerETLTaskManager {
  private readonly _spotifyService: ConnectorSpotifyService;
  private readonly _githubService: ConnectorGitHubService;
  private readonly _linearService: ConnectorLinearService;
  private readonly _xService: ConnectorXService;
  private readonly _notionService: ConnectorNotionService;
  private readonly _slackService: ConnectorSlackService;

  constructor() {
    this._spotifyService = new ConnectorSpotifyService();
    this._githubService = new ConnectorGitHubService();
    this._linearService = new ConnectorLinearService();
    this._xService = new ConnectorXService();
    this._notionService = new ConnectorNotionService();
    this._slackService = new ConnectorSlackService();
  }

  public registerTasks(): void {
    // Register Spotify Track ETL
    schedulerRegistry.register(SpotifyETLs.track, async (data) => {
      console.info(`[${SpotifyETLs.track}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${SpotifyETLs.track}] Fetching tracks from Spotify API (incremental)...`);
        let totalFetched = 0;

        for await (const batch of this._spotifyService.fetchEntitiesPaginated(
          SPOTIFY_ENTITY_TYPES_ENUM.TRACK,
          true, // shouldConnect
        )) {
          totalFetched += batch.length;
          console.info(`[${SpotifyETLs.track}] Processing batch of ${batch.length} tracks...`);
          await this._spotifyService.connector.store.save(batch);
        }

        console.info(`[${SpotifyETLs.track}] Fetched ${totalFetched} tracks (changed only)`);

        console.info(`[${SpotifyETLs.track}] Running ETL to Qdrant...`);
        await runSpotifyTrackETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.track}] Completed`);
      });
    });

    // Register Spotify Artist ETL
    schedulerRegistry.register(SpotifyETLs.artist, async (data) => {
      console.info(`[${SpotifyETLs.artist}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${SpotifyETLs.artist}] Fetching artists from Spotify API...`);
        const artists = await this._spotifyService.fetchArtists();
        console.info(`[${SpotifyETLs.artist}] Fetched ${artists.length} artists`);

        console.info(`[${SpotifyETLs.artist}] Saving artists to Postgres...`);
        await this._spotifyService.connector.store.save(artists);
        console.info(`[${SpotifyETLs.artist}] Saved to Postgres`);

        console.info(`[${SpotifyETLs.artist}] Running ETL to Qdrant...`);
        await runSpotifyArtistETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.artist}] Completed`);
      });
    });

    // Register Spotify Playlist ETL
    schedulerRegistry.register(SpotifyETLs.playlist, async (data) => {
      console.info(`[${SpotifyETLs.playlist}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${SpotifyETLs.playlist}] Fetching playlists from Spotify API (incremental)...`);
        let totalFetched = 0;

        for await (const batch of this._spotifyService.fetchEntitiesPaginated(
          SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST,
          true, // shouldConnect
        )) {
          totalFetched += batch.length;
          console.info(`[${SpotifyETLs.playlist}] Processing batch of ${batch.length} playlists...`);
          await this._spotifyService.connector.store.save(batch);
        }

        console.info(`[${SpotifyETLs.playlist}] Fetched ${totalFetched} playlists (changed only)`);

        console.info(`[${SpotifyETLs.playlist}] Running ETL to Qdrant...`);
        await runSpotifyPlaylistETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.playlist}] Completed`);
      });
    });

    // Register Spotify Album ETL
    schedulerRegistry.register(SpotifyETLs.album, async (data) => {
      console.info(`[${SpotifyETLs.album}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${SpotifyETLs.album}] Fetching albums from Spotify API (incremental)...`);
        let totalFetched = 0;

        for await (const batch of this._spotifyService.fetchEntitiesPaginated(
          SPOTIFY_ENTITY_TYPES_ENUM.ALBUM,
          true, // shouldConnect
        )) {
          totalFetched += batch.length;
          console.info(`[${SpotifyETLs.album}] Processing batch of ${batch.length} albums...`);
          await this._spotifyService.connector.store.save(batch);
        }

        console.info(`[${SpotifyETLs.album}] Fetched ${totalFetched} albums (changed only)`);

        console.info(`[${SpotifyETLs.album}] Running ETL to Qdrant...`);
        await runSpotifyAlbumETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.album}] Completed`);
      });
    });

    // Register Spotify Recently Played ETL
    schedulerRegistry.register(SpotifyETLs.recentlyPlayed, async (data) => {
      console.info(`[${SpotifyETLs.recentlyPlayed}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${SpotifyETLs.recentlyPlayed}] Fetching recently played from Spotify API (incremental)...`);
        let totalFetched = 0;

        for await (const batch of this._spotifyService.fetchEntitiesPaginated(
          SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED,
          true, // shouldConnect
        )) {
          totalFetched += batch.length;
          console.info(`[${SpotifyETLs.recentlyPlayed}] Processing batch of ${batch.length} items...`);
          await this._spotifyService.connector.store.save(batch);
        }

        console.info(`[${SpotifyETLs.recentlyPlayed}] Fetched ${totalFetched} recently played items`);

        console.info(`[${SpotifyETLs.recentlyPlayed}] Running ETL to Qdrant...`);
        await runSpotifyRecentlyPlayedETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.recentlyPlayed}] Completed`);
      });
    });

    // Register GitHub Repository ETL
    schedulerRegistry.register(GitHubETLs.repository, async (data) => {
      console.info(`[${GitHubETLs.repository}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // 1. Fetch fresh data from GitHub API using pagination
        console.info(`[${GitHubETLs.repository}] Fetching repositories from GitHub API (incremental)...`);
        let totalFetched = 0;
        let totalChanged = 0;

        for await (const batch of this._githubService.fetchEntitiesPaginated(
          GITHUB_ENTITY_TYPES_ENUM.REPOSITORY,
          true, // shouldConnect
        )) {
          totalFetched += batch.length;
          totalChanged += batch.length; // All yielded items are changed (checksum filtered)

          console.info(`[${GitHubETLs.repository}] Processing batch of ${batch.length} repositories...`);

          // 2. Save batch to Postgres
          await this._githubService.connector.store.save(batch);
        }

        console.info(`[${GitHubETLs.repository}] Fetched ${totalFetched} repositories (${totalChanged} changed)`);

        // 3. Run ETL to Qdrant
        console.info(`[${GitHubETLs.repository}] Running ETL to Qdrant...`);
        await runGitHubRepositoryETL(qdrant, postgres);
        console.info(`[${GitHubETLs.repository}] Completed`);
      });
    });

    // Register GitHub Pull Request ETL
    schedulerRegistry.register(GitHubETLs.pullRequest, async (data) => {
      console.info(`[${GitHubETLs.pullRequest}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // 1. Fetch fresh data from GitHub API (incremental)
        console.info(`[${GitHubETLs.pullRequest}] Fetching pull requests from GitHub API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._githubService.fetchEntitiesPaginated(
            GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            console.info(`[${GitHubETLs.pullRequest}] Processing batch of ${batch.length} pull requests...`);

            // 2. Save batch to Postgres
            await this._githubService.connector.store.save(batch);
          }
          console.info(`[${GitHubETLs.pullRequest}] Fetched ${totalFetched} pull requests`);
        } catch (error) {
          console.error(`[${GitHubETLs.pullRequest}] Error fetching pull requests (likely rate limit). Proceeding to ETL...`, error);
        }

        // 3. Run ETL to Qdrant
        console.info(`[${GitHubETLs.pullRequest}] Running ETL to Qdrant...`);
        await runGitHubPullRequestETL(qdrant, postgres);
        console.info(`[${GitHubETLs.pullRequest}] Completed`);
      });
    });

    // Register GitHub Commit ETL
    schedulerRegistry.register(GitHubETLs.commit, async (data) => {
      console.info(`[${GitHubETLs.commit}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // 1. Fetch fresh data from GitHub API (incremental)
        console.info(`[${GitHubETLs.commit}] Fetching commits from GitHub API (incremental)...`);
        let totalFetched = 0;

        try {
          for await (const batch of this._githubService.fetchEntitiesPaginated(
            GITHUB_ENTITY_TYPES_ENUM.COMMIT,
            true, // shouldConnect
          )) {
            totalFetched += batch.length;
            console.info(`[${GitHubETLs.commit}] Processing batch of ${batch.length} commits...`);

            // 2. Save batch to Postgres
            await this._githubService.connector.store.save(batch);
          }
          console.info(`[${GitHubETLs.commit}] Fetched ${totalFetched} commits`);
        } catch (error) {
          console.error(`[${GitHubETLs.commit}] Error fetching commits (likely rate limit). Proceeding to ETL...`, error);
        }

        // 3. Run ETL to Qdrant
        console.info(`[${GitHubETLs.commit}] Running ETL to Qdrant...`);
        await runGitHubCommitETL(qdrant, postgres);
        console.info(`[${GitHubETLs.commit}] Completed`);
      });
    });

    // Register Linear Issue ETL
    schedulerRegistry.register(LinearETLs.issue, async (data) => {
      console.info(`[${LinearETLs.issue}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${LinearETLs.issue}] Fetching issues from Linear API (incremental)...`);
        let totalFetched = 0;

        for await (const batch of this._linearService.fetchEntitiesPaginated(
          LINEAR_ENTITY_TYPES_ENUM.ISSUE,
          true, // shouldConnect
        )) {
          totalFetched += batch.length;
          console.info(`[${LinearETLs.issue}] Processing batch of ${batch.length} issues...`);
          await this._linearService.connector.store.save(batch);
        }

        console.info(`[${LinearETLs.issue}] Fetched ${totalFetched} issues (changed only)`);

        console.info(`[${LinearETLs.issue}] Running ETL to Qdrant...`);
        await runLinearETL(qdrant, postgres);
        console.info(`[${LinearETLs.issue}] Completed`);
      });
    });

    // Register X (Twitter) Tweet ETL
    schedulerRegistry.register(XETLs.tweet, async (data) => {
      console.info(`[${XETLs.tweet}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // console.info(`[${XETLs.tweet}] Fetching tweets from X API...`);
        // const tweets = await this._xService.fetchTweets();
        // console.info(`[${XETLs.tweet}] Fetched ${tweets.length} tweets`);

        // console.info(`[${XETLs.tweet}] Saving tweets to Postgres...`);
        // await this._xService.connector.store.save(tweets);
        // console.info(`[${XETLs.tweet}] Saved to Postgres`);

        console.info(`[${XETLs.tweet}] Running ETL to Qdrant...`);
        await runXETL(qdrant, postgres);
        console.info(`[${XETLs.tweet}] Completed`);
      });
    });

    // Register Notion Page ETL
    schedulerRegistry.register(NotionETLs.page, async (data) => {
      console.info(`[${NotionETLs.page}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${NotionETLs.page}] Fetching pages from Notion API (incremental)...`);
        let totalFetched = 0;

        for await (const batch of this._notionService.fetchEntitiesPaginated(
          NOTION_ENTITY_TYPES_ENUM.PAGE,
          true, // shouldConnect
        )) {
          totalFetched += batch.length;
          console.info(`[${NotionETLs.page}] Processing batch of ${batch.length} pages...`);
          await this._notionService.connector.store.save(batch);
        }

        console.info(`[${NotionETLs.page}] Fetched ${totalFetched} pages (changed only)`);

        console.info(`[${NotionETLs.page}] Running ETL to Qdrant...`);
        await runNotionETL(qdrant, postgres);
        console.info(`[${NotionETLs.page}] Completed`);
      });
    });

    // Register Slack Message ETL
    schedulerRegistry.register(SlackETLs.message, async (data) => {
      console.info(`[${SlackETLs.message}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${SlackETLs.message}] Fetching messages from Slack API (incremental)...`);
        let totalFetched = 0;

        for await (const batch of this._slackService.fetchEntitiesPaginated(
          SLACK_ENTITY_TYPES_ENUM.MESSAGE,
          true, // shouldConnect
        )) {
          totalFetched += batch.length;
          console.info(`[${SlackETLs.message}] Processing batch of ${batch.length} messages...`);
          await this._slackService.connector.store.save(batch);
        }

        console.info(`[${SlackETLs.message}] Fetched ${totalFetched} messages (changed only)`);

        console.info(`[${SlackETLs.message}] Running ETL to Qdrant...`);
        await runSlackETL(qdrant, postgres);
        console.info(`[${SlackETLs.message}] Completed`);
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

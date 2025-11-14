import {
  runSpotifyTrackETL,
  runSpotifyArtistETL,
  runSpotifyPlaylistETL,
  runSpotifyAlbumETL,
  runSpotifyRecentlyPlayedETL,
  runGitHubRepositoryETL,
  runGitHubPullRequestETL,
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
        console.info(`[${SpotifyETLs.track}] Fetching tracks from Spotify API...`);
        const tracks = await this._spotifyService.fetchTracks();
        console.info(`[${SpotifyETLs.track}] Fetched ${tracks.length} tracks`);

        console.info(`[${SpotifyETLs.track}] Saving tracks to Postgres...`);
        await this._spotifyService.connector.store.save(tracks);
        console.info(`[${SpotifyETLs.track}] Saved to Postgres`);

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
        console.info(`[${SpotifyETLs.playlist}] Fetching playlists from Spotify API...`);
        const playlists = await this._spotifyService.fetchPlaylists();
        console.info(`[${SpotifyETLs.playlist}] Fetched ${playlists.length} playlists`);

        console.info(`[${SpotifyETLs.playlist}] Saving playlists to Postgres...`);
        await this._spotifyService.connector.store.save(playlists);
        console.info(`[${SpotifyETLs.playlist}] Saved to Postgres`);

        console.info(`[${SpotifyETLs.playlist}] Running ETL to Qdrant...`);
        await runSpotifyPlaylistETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.playlist}] Completed`);
      });
    });

    // Register Spotify Album ETL
    schedulerRegistry.register(SpotifyETLs.album, async (data) => {
      console.info(`[${SpotifyETLs.album}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${SpotifyETLs.album}] Fetching albums from Spotify API...`);
        const albums = await this._spotifyService.fetchAlbums();
        console.info(`[${SpotifyETLs.album}] Fetched ${albums.length} albums`);

        console.info(`[${SpotifyETLs.album}] Saving albums to Postgres...`);
        await this._spotifyService.connector.store.save(albums);
        console.info(`[${SpotifyETLs.album}] Saved to Postgres`);

        console.info(`[${SpotifyETLs.album}] Running ETL to Qdrant...`);
        await runSpotifyAlbumETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.album}] Completed`);
      });
    });

    // Register Spotify Recently Played ETL
    schedulerRegistry.register(SpotifyETLs.recentlyPlayed, async (data) => {
      console.info(`[${SpotifyETLs.recentlyPlayed}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${SpotifyETLs.recentlyPlayed}] Fetching recently played from Spotify API...`);
        const recentlyPlayed = await this._spotifyService.fetchRecentlyPlayed();
        console.info(`[${SpotifyETLs.recentlyPlayed}] Fetched ${recentlyPlayed.length} recently played items`);

        console.info(`[${SpotifyETLs.recentlyPlayed}] Saving recently played to Postgres...`);
        await this._spotifyService.connector.store.save(recentlyPlayed);
        console.info(`[${SpotifyETLs.recentlyPlayed}] Saved to Postgres`);

        console.info(`[${SpotifyETLs.recentlyPlayed}] Running ETL to Qdrant...`);
        await runSpotifyRecentlyPlayedETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.recentlyPlayed}] Completed`);
      });
    });

    // Register GitHub Repository ETL
    schedulerRegistry.register(GitHubETLs.repository, async (data) => {
      console.info(`[${GitHubETLs.repository}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        // 1. Fetch fresh data from GitHub API
        console.info(`[${GitHubETLs.repository}] Fetching repositories from GitHub API...`);
        const repositories = await this._githubService.fetchRepositories();
        console.info(`[${GitHubETLs.repository}] Fetched ${repositories.length} repositories`);

        // 2. Save to Postgres
        console.info(`[${GitHubETLs.repository}] Saving repositories to Postgres...`);
        await this._githubService.connector.store.save(repositories);
        console.info(`[${GitHubETLs.repository}] Saved to Postgres`);

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
        // 1. Fetch fresh data from GitHub API
        console.info(`[${GitHubETLs.pullRequest}] Fetching pull requests from GitHub API...`);
        const pullRequests = await this._githubService.fetchPullRequests();
        console.info(`[${GitHubETLs.pullRequest}] Fetched ${pullRequests.length} pull requests`);

        // 2. Save to Postgres
        console.info(`[${GitHubETLs.pullRequest}] Saving pull requests to Postgres...`);
        await this._githubService.connector.store.save(pullRequests);
        console.info(`[${GitHubETLs.pullRequest}] Saved to Postgres`);

        // 3. Run ETL to Qdrant
        console.info(`[${GitHubETLs.pullRequest}] Running ETL to Qdrant...`);
        await runGitHubPullRequestETL(qdrant, postgres);
        console.info(`[${GitHubETLs.pullRequest}] Completed`);
      });
    });

    // Register Linear Issue ETL
    schedulerRegistry.register(LinearETLs.issue, async (data) => {
      console.info(`[${LinearETLs.issue}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${LinearETLs.issue}] Fetching issues from Linear API...`);
        const issues = await this._linearService.fetchIssues();
        console.info(`[${LinearETLs.issue}] Fetched ${issues.length} issues`);

        console.info(`[${LinearETLs.issue}] Saving issues to Postgres...`);
        await this._linearService.connector.store.save(issues);
        console.info(`[${LinearETLs.issue}] Saved to Postgres`);

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
        console.info(`[${NotionETLs.page}] Fetching pages from Notion API...`);
        const pages = await this._notionService.fetchPages();
        console.info(`[${NotionETLs.page}] Fetched ${pages.length} pages`);

        console.info(`[${NotionETLs.page}] Saving pages to Postgres...`);
        await this._notionService.connector.store.save(pages);
        console.info(`[${NotionETLs.page}] Saved to Postgres`);

        console.info(`[${NotionETLs.page}] Running ETL to Qdrant...`);
        await runNotionETL(qdrant, postgres);
        console.info(`[${NotionETLs.page}] Completed`);
      });
    });

    // Register Slack Message ETL
    schedulerRegistry.register(SlackETLs.message, async (data) => {
      console.info(`[${SlackETLs.message}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        console.info(`[${SlackETLs.message}] Fetching messages from Slack API...`);
        const messages = await this._slackService.fetchMessages();
        console.info(`[${SlackETLs.message}] Fetched ${messages.length} messages`);

        console.info(`[${SlackETLs.message}] Saving messages to Postgres...`);
        await this._slackService.connector.store.save(messages);
        console.info(`[${SlackETLs.message}] Saved to Postgres`);

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

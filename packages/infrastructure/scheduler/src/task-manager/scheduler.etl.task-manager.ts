import {
  runSpotifyETL,
  runSpotifyRecentlyPlayedETL,
  runGitHubETL,
  runLinearETL,
  runXETL,
  SpotifyETLs,
  GitHubETLs,
  LinearETLs,
  XETLs,
} from "@ait/retove";
import { getQdrantClient } from "@ait/qdrant";
import { getPostgresClient, closePostgresConnection } from "@ait/postgres";
import { schedulerRegistry } from "../registry/scheduler.etl.registry";

export interface ISchedulerETLTaskManager {
  registerTasks(): void;
}

export class SchedulerETLTaskManager implements ISchedulerETLTaskManager {
  public registerTasks(): void {
    // Register Spotify Track ETL
    schedulerRegistry.register(SpotifyETLs.track, async (data) => {
      console.info(`[${SpotifyETLs.track}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        await runSpotifyETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.track}] Completed`);
      });
    });

    // Register Spotify Artist ETL
    schedulerRegistry.register(SpotifyETLs.artist, async (data) => {
      console.info(`[${SpotifyETLs.artist}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        await runSpotifyETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.artist}] Completed`);
      });
    });

    // Register Spotify Playlist ETL
    schedulerRegistry.register(SpotifyETLs.playlist, async (data) => {
      console.info(`[${SpotifyETLs.playlist}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        await runSpotifyETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.playlist}] Completed`);
      });
    });

    // Register Spotify Album ETL
    schedulerRegistry.register(SpotifyETLs.album, async (data) => {
      console.info(`[${SpotifyETLs.album}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        await runSpotifyETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.album}] Completed`);
      });
    });

    // Register GitHub Repository ETL
    schedulerRegistry.register(GitHubETLs.repository, async (data) => {
      console.info(`[${GitHubETLs.repository}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        await runGitHubETL(qdrant, postgres);
        console.info(`[${GitHubETLs.repository}] Completed`);
      });
    });

    schedulerRegistry.register(LinearETLs.issue, async (data) => {
      console.info(`[${LinearETLs.issue}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        await runLinearETL(qdrant, postgres);
        console.info(`[${LinearETLs.issue}] Completed`);
      });
    });

    schedulerRegistry.register(XETLs.tweet, async (data) => {
      console.info(`[${XETLs.tweet}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        await runXETL(qdrant, postgres);
        console.info(`[${XETLs.tweet}] Completed`);
      });
    });

    // Register Spotify Recently Played ETL
    schedulerRegistry.register(SpotifyETLs.recentlyPlayed, async (data) => {
      console.info(`[${SpotifyETLs.recentlyPlayed}] Starting...`);

      await this._withConnections(async ({ qdrant, postgres }) => {
        await runSpotifyRecentlyPlayedETL(qdrant, postgres);
        console.info(`[${SpotifyETLs.recentlyPlayed}] Completed`);
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

    try {
      return await operation({ qdrant: qdrantClient, postgres: pgClient });
    } finally {
      await closePostgresConnection();
    }
  }
}

export const schedulerETLTaskManager = new SchedulerETLTaskManager();

import { runSpotifyETL, runGitHubETL, SpotifyETLs, GitHubETLs } from "@ait/retove";
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

    // Register GitHub Repository ETL
    schedulerRegistry.register(GitHubETLs.repository, async (data) => {
      console.info(`[${GitHubETLs.repository}] Starting...`);
      await this._withConnections(async ({ qdrant, postgres }) => {
        await runGitHubETL(qdrant, postgres);
        console.info(`[${GitHubETLs.repository}] Completed`);
      });
    });

    console.info("ETL tasks registered:", schedulerRegistry.list());
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

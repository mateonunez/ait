import { runSpotifyETL, runGitHubETL, SpotifyETLs, GitHubETLs } from "@ait/retove";
import { getQdrantClient } from "@ait/qdrant";
import { getPostgresClient, closePostgresConnection } from "@ait/postgres";
import { SchedulerTaskRegistry } from "../registry/scheduler.etl.registry";

SchedulerTaskRegistry.register(SpotifyETLs.track, async (data) => {
  const qdrantClient = getQdrantClient();
  const pgClient = getPostgresClient();
  try {
    console.log("[RetoveSpotifyTrackETL] Running...");
    await runSpotifyETL(qdrantClient, pgClient);
  } finally {
    await closePostgresConnection();
  }
});

SchedulerTaskRegistry.register(GitHubETLs.repository, async (data) => {
  const qdrantClient = getQdrantClient();
  const pgClient = getPostgresClient();
  try {
    console.log(`[${GitHubETLs.repository}] Running...`);
    await runGitHubETL(qdrantClient, pgClient);
  } finally {
    await closePostgresConnection();
  }
});

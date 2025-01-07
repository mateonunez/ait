import { runSpotifyETL, runGitHubETL } from "@ait/retove";
import { getQdrantClient } from "@ait/qdrant";
import { getPostgresClient, closePostgresConnection } from "@ait/postgres";
import { SchedulerTaskRegistry } from "../registry/scheduler.etl.registry";

SchedulerTaskRegistry.register("RetoveSpotifyTrackETL", async (data) => {
  const qdrantClient = getQdrantClient();
  const pgClient = getPostgresClient();
  try {
    console.log("[RetoveSpotifyTrackETL] Running...");
    await runSpotifyETL(qdrantClient, pgClient);
  } finally {
    await closePostgresConnection();
  }
});

SchedulerTaskRegistry.register("RetoveGitHubRepositoryETL", async (data) => {
  const qdrantClient = getQdrantClient();
  const pgClient = getPostgresClient();
  try {
    console.log("[RetoveGitHubRepositoryETL] Running...");
    await runGitHubETL(qdrantClient, pgClient);
  } finally {
    await closePostgresConnection();
  }
});

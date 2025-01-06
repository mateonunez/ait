import { runSpotifyETL, runGitHubETL } from "@ait/etl";
import { getQdrantClient } from "@ait/qdrant";
import { getPostgresClient, closePostgresConnection } from "@ait/postgres";
import { SchedulerTaskRegistry } from "../registry/scheduler.etl.registry";

SchedulerTaskRegistry.register("SpotifyTrackETL", async (data) => {
  const qdrantClient = getQdrantClient();
  const pgClient = getPostgresClient();
  try {
    console.log("[SpotifyTrackETL] Running...");
    await runSpotifyETL(qdrantClient, pgClient);
  } finally {
    await closePostgresConnection();
  }
});

SchedulerTaskRegistry.register("GitHubRepositoryETL", async (data) => {
  const qdrantClient = getQdrantClient();
  const pgClient = getPostgresClient();
  try {
    console.log("[GitHubRepositoryETL] Running...");
    await runGitHubETL(qdrantClient, pgClient);
  } finally {
    await closePostgresConnection();
  }
});

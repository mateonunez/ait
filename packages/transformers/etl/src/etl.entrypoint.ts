import { SpotifyTrackETL } from "./etl/spotify/spotify.track.etl";
import { getQdrantClient, type qdrant } from "@ait/qdrant";
import { getPostgresClient, closePostgresConnection } from "@ait/postgres";
import { GitHubRepositoryETL } from "./etl/github/github.repository.etl";

async function main() {
  console.log("🚀 Starting ETL process...");
  try {
    const qdrantClient = getQdrantClient();
    const pgClient = getPostgresClient();

    await runSpotifyETL(qdrantClient, pgClient);

    await runGitHubETL(qdrantClient, pgClient);

    console.log("✅ ETL process completed successfully!");
  } catch (error) {
    console.error("❌ ETL error:", error);
  } finally {
    console.log("🔒 Closing Postgres connection...");
    await closePostgresConnection();
    console.log("👋 ETL process finished.");
  }
}

/**
 * TODO: refactor this is not maintainable and scalable
 */

export async function runSpotifyETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const spotifyETL = new SpotifyTrackETL(pgClient, qdrantClient);

  console.log("🔍 Running SpotifyTrackETL with limit of 100...");
  await spotifyETL.run(100);
  console.log("✅ SpotifyTrackETL process completed successfully!");
}
export async function runGitHubETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const githubETL = new GitHubRepositoryETL(pgClient, qdrantClient);

  console.log("🔍 Running GitHubRepositoryETL with limit of 100...");
  await githubETL.run(100);
  console.log("✅ GitHubRepositoryETL process completed successfully!");
}

main();

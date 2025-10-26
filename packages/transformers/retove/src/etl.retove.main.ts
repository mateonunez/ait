import { getQdrantClient } from "@ait/qdrant";
import { getPostgresClient, closePostgresConnection } from "@ait/postgres";
import {
  runSpotifyTrackETL,
  runSpotifyArtistETL,
  runSpotifyPlaylistETL,
  runSpotifyAlbumETL,
  runSpotifyRecentlyPlayedETL,
  runGitHubRepositoryETL,
  runLinearETL,
  runXETL,
  runGitHubPullRequestETL,
} from "./infrastructure/runners/etl.runners";

async function main() {
  console.log("🚀 Starting ETL process...");
  try {
    const qdrantClient = getQdrantClient();
    const pgClient = getPostgresClient();

    // Run all Spotify ETLs
    await runSpotifyTrackETL(qdrantClient, pgClient);
    await runSpotifyArtistETL(qdrantClient, pgClient);
    await runSpotifyPlaylistETL(qdrantClient, pgClient);
    await runSpotifyAlbumETL(qdrantClient, pgClient);
    await runSpotifyRecentlyPlayedETL(qdrantClient, pgClient);

    // Run other vendor ETLs
    await runGitHubRepositoryETL(qdrantClient, pgClient);
    await runGitHubPullRequestETL(qdrantClient, pgClient);
    await runXETL(qdrantClient, pgClient);
    await runLinearETL(qdrantClient, pgClient);

    console.log("✅ ETL process completed successfully!");
  } catch (error) {
    console.error("❌ ETL error:", error);
  } finally {
    console.log("🔒 Closing Postgres connection...");
    await closePostgresConnection();
    console.log("👋 ETL process finished.");
  }
}

main();

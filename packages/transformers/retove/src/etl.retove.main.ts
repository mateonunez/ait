import { getQdrantClient } from "@ait/qdrant";
import { getPostgresClient, closePostgresConnection } from "@ait/postgres";
import { getLogger } from "@ait/core";
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
  runGitHubCommitETL,
  runNotionETL,
  runSlackETL,
  runGoogleYouTubeSubscriptionETL,
} from "./infrastructure/runners/etl.runners";

const logger = getLogger();

async function main() {
  logger.info("🚀 Starting ETL process...");
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
    await runGitHubCommitETL(qdrantClient, pgClient);
    await runXETL(qdrantClient, pgClient);
    await runLinearETL(qdrantClient, pgClient);
    await runNotionETL(qdrantClient, pgClient);
    await runSlackETL(qdrantClient, pgClient);
    await runGoogleYouTubeSubscriptionETL(qdrantClient, pgClient);

    logger.info("✅ ETL process completed successfully!");
  } catch (error) {
    logger.error("❌ ETL error:", { error });
  } finally {
    logger.info("🔒 Closing Postgres connection...");
    await closePostgresConnection();
    logger.info("👋 ETL process finished.");
    process.exit(0);
  }
}

main();

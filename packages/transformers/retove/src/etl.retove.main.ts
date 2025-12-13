import { getLogger } from "@ait/core";
import { closePostgresConnection, getPostgresClient } from "@ait/postgres";
import { getQdrantClient } from "@ait/qdrant";
import {
  runGitHubCommitETL,
  runGitHubFileETL,
  runGitHubPullRequestETL,
  runGitHubRepositoryETL,
  runGoogleYouTubeSubscriptionETL,
  runLinearETL,
  runNotionETL,
  runSlackETL,
  runSpotifyAlbumETL,
  runSpotifyArtistETL,
  runSpotifyPlaylistETL,
  runSpotifyRecentlyPlayedETL,
  runSpotifyTrackETL,
  runXETL,
} from "./infrastructure/runners/etl.runners";

const logger = getLogger();

async function main() {
  logger.info("🚀 Starting ETL process...");
  try {
    const qdrantClient = getQdrantClient();
    const pgClient = getPostgresClient();

    await runSpotifyTrackETL(qdrantClient, pgClient);
    await runSpotifyArtistETL(qdrantClient, pgClient);
    await runSpotifyPlaylistETL(qdrantClient, pgClient);
    await runSpotifyAlbumETL(qdrantClient, pgClient);
    await runSpotifyRecentlyPlayedETL(qdrantClient, pgClient);

    await runGitHubRepositoryETL(qdrantClient, pgClient);
    await runGitHubPullRequestETL(qdrantClient, pgClient);
    await runGitHubCommitETL(qdrantClient, pgClient);
    await runGitHubFileETL(qdrantClient, pgClient);

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

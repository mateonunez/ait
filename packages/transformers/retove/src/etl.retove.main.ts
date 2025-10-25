import { getQdrantClient } from "@ait/qdrant";
import { getPostgresClient, closePostgresConnection } from "@ait/postgres";
import { runSpotifyETL } from "./infrastructure/runners/etl.runners";

async function main() {
  console.log("🚀 Starting ETL process...");
  try {
    const qdrantClient = getQdrantClient();
    const pgClient = getPostgresClient();

    await runSpotifyETL(qdrantClient, pgClient);
    // await runGitHubETL(qdrantClient, pgClient);
    // await runXETL(qdrantClient, pgClient);
    // await runLinearETL(qdrantClient, pgClient);

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

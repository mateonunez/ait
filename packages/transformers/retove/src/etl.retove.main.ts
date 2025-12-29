import { getLogger } from "@ait/core";
import { closePostgresConnection, getPostgresClient } from "@ait/postgres";
import { getQdrantClient } from "@ait/qdrant";
import {
  // runGitHubCommitETL,
  // runGitHubFileETL,
  // runGitHubPullRequestETL,
  // runGitHubRepositoryETL,
  // runGoogleCalendarEventETL,
  // runGoogleContactETL,
  runGooglePhotoETL,
  // runGoogleYouTubeSubscriptionETL,
  runLinearETL,
  runNotionETL,
  runSlackETL,
  // runSpotifyAlbumETL,
  // runSpotifyArtistETL,
  // runSpotifyPlaylistETL,
  // runSpotifyRecentlyPlayedETL,
  // runSpotifyTrackETL,
  runXETL,
} from "./infrastructure/runners/etl.runners";

const logger = getLogger();

const etlRunners: Record<any, any> = {
  // track: runSpotifyTrackETL,
  // artist: runSpotifyArtistETL,
  // playlist: runSpotifyPlaylistETL,
  // album: runSpotifyAlbumETL,
  // recently_played: runSpotifyRecentlyPlayedETL,
  // repository: runGitHubRepositoryETL,
  // pull_request: runGitHubPullRequestETL,
  // commit: runGitHubCommitETL,
  // repository_file: runGitHubFileETL,
  tweet: runXETL,
  issue: runLinearETL,
  page: runNotionETL,
  message: runSlackETL,
  // subscription: runGoogleYouTubeSubscriptionETL,
  // event: runGoogleCalendarEventETL,
  // google_contact: runGoogleContactETL,
  google_photo: runGooglePhotoETL,
  // calendar: undefined,
};

async function main() {
  const args = process.argv.slice(2);
  const isManualRun = args.includes("--manual");
  const jobArg = args.find((arg) => arg.startsWith("--etl="));
  const etlName = jobArg ? jobArg.split("=")[1] : args.find((arg) => !arg.startsWith("-") && arg !== "manual");

  if (isManualRun && etlName) {
    logger.info(`🚀 Starting ETL process (Manual: ${etlName})...`);
  } else if (isManualRun && !etlName) {
    logger.error("❌ --manual requires --etl=<name> argument");
    logger.info(`Available ETLs: ${Object.keys(etlRunners).join(", ")}`);
    process.exit(1);
  } else {
    logger.info("🚀 Starting ETL process (All)...");
  }

  const results: { name: string; status: "success" | "failure"; error?: any }[] = [];

  const runETL = async (name: string, runner: (q: any, p: any) => Promise<void>, qdrantClient: any, pgClient: any) => {
    logger.info(`⏳ Starting ${name}...`);
    try {
      await runner(qdrantClient, pgClient);
      logger.info(`✅ ${name} completed successfully`);
      results.push({ name, status: "success" });
    } catch (error) {
      logger.error(`❌ ${name} failed`, { error });
      results.push({ name, status: "failure", error });
    }
  };

  try {
    const qdrantClient = getQdrantClient();
    const pgClient = getPostgresClient();

    if (isManualRun && etlName) {
      const runner = etlRunners[etlName as keyof typeof etlRunners];
      if (!runner) {
        logger.warn(`Unknown ETL: ${etlName}. Available: ${Object.keys(etlRunners).join(", ")}`);
        return;
      }
      await runETL(etlName, runner, qdrantClient, pgClient);
    } else {
      for (const [name, runner] of Object.entries(etlRunners)) {
        if (!runner) {
          logger.warn(`⚠️ Skipping ${name} (No runner implementation)`);
          continue;
        }
        await runETL(name, runner, qdrantClient, pgClient);
      }
    }

    logger.info("\n📊 ETL Execution Summary:");
    const failureCount = results.filter((r) => r.status === "failure").length;

    console.table(
      results.map((r) => ({
        ETL: r.name,
        Status: r.status === "success" ? "✅ Success" : "❌ Failure",
        Error: r.error ? String(r.error) : "-",
      })),
    );

    if (failureCount > 0) {
      logger.warn(`⚠️ Completed with ${failureCount} failures.`);
      process.exit(1);
    } else {
      logger.info("✅ All ETLs completed successfully!");
    }
  } catch (error) {
    logger.error("❌ Critical ETL error:", { error });
    process.exit(1);
  } finally {
    logger.info("🔒 Closing Postgres connection...");
    await closePostgresConnection();
    logger.info("👋 ETL process finished.");
    process.exit(0);
  }
}

main();

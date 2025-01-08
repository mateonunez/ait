import { Scheduler } from "./scheduler.service";
import dotenv from "dotenv";
import "./tasks/scheduler.etl.task";
import { GitHubETLs, SpotifyETLs } from "@ait/retove";

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

const etlScheduler = new Scheduler("etl-scheduler", {
  host: REDIS_HOST,
  port: REDIS_PORT,
});

async function main() {
  await etlScheduler.scheduleJob(SpotifyETLs.track, {}, "*/5 * * * *");
  await etlScheduler.scheduleJob(GitHubETLs.repository, {}, "*/5 * * * *");

  await etlScheduler.start();
  console.log("🚀 ETL Scheduler started");

  process.on("SIGINT", async () => {
    console.log("🔒 Stopping ETL Scheduler...");
    await etlScheduler.stop();
    process.exit(0);
  });
}

main();

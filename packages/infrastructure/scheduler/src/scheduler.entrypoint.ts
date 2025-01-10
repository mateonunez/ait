import dotenv from "dotenv";
import { Scheduler } from "./scheduler.service";
import type { IRedisConfig } from "@ait/redis";
import { GitHubETLs, SpotifyETLs } from "@ait/retove";
import { schedulerETLTaskManager } from "./task-manager/scheduler.etl.task-manager";

// Load environment variables
dotenv.config();

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test", override: true });
}

schedulerETLTaskManager.registerTasks();

async function main() {
  try {
    const redisConfig: IRedisConfig = {
      url: process.env.REDIS_URL || "redis://localhost:6379",
      maxRetriesPerRequest: null,
    };

    const etlScheduler = new Scheduler({
      queueName: "etl-scheduler",
      redisConfig,
    });

    await Promise.all([
      etlScheduler.scheduleJob(GitHubETLs.repository, { limit: 10 }, "*/5 * * * *"),
      etlScheduler.scheduleJob(SpotifyETLs.track, { limit: 10 }, "*/5 * * * *"),
    ]);

    // Start the scheduler
    await etlScheduler.start();
    console.info("🚀 ETL Scheduler started successfully");

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.info(`📥 Received ${signal}. Shutting down...`);
      await etlScheduler.stop();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("💥 Failed to start ETL Scheduler:", error);
    process.exit(1);
  }
}

// Start the application
main();

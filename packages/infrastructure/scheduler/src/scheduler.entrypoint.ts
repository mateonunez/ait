import dotenv from "dotenv";
import { Scheduler } from "./scheduler.service";
import type { IRedisConfig } from "@ait/redis";
import {
  GitHubETLs,
  SpotifyETLs,
  LinearETLs,
  XETLs,
  NotionETLs,
  SlackETLs,
  GoogleCalendarETLs,
  GoogleYouTubeETLs,
} from "@ait/retove";
import { schedulerETLTaskManager } from "./task-manager/scheduler.etl.task-manager";
import { closePostgresConnection } from "@ait/postgres";
import { getLogger } from "@ait/core";

const logger = getLogger();

interface JobConfig {
  name: string;
  options: Record<string, unknown>;
  cronExpression: string;
  priority?: number;
  enabled?: boolean;
}

const getScheduleConfig = () => {
  const isDev = process.env.NODE_ENV === "development";
  const batchSize = Number.parseInt(process.env.ETL_BATCH_SIZE || "50", 10);

  return {
    isDev,
    batchSize,
    highPriorityCron: isDev ? "*/30 * * * *" : "*/5 * * * *", // Every 15 min (dev) / 5 min (prod)
    mediumPriorityCron: isDev ? "0 * * * *" : "0 */2 * * *", // Hourly (dev) / Every 2 hours (prod)
    lowPriorityCron: isDev ? "0 */6 * * *" : "0 */4 * * *", // Every 6 hours (dev) / Every 4 hours (prod)
  };
};

const scheduleConfig = getScheduleConfig();

const SCHEDULED_JOBS: JobConfig[] = [
  {
    name: SpotifyETLs.recentlyPlayed,
    options: {},
    cronExpression: scheduleConfig.highPriorityCron,
    priority: 0,
    enabled: true,
  },
  {
    name: SlackETLs.message,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.highPriorityCron,
    priority: 0,
    enabled: true,
  },

  {
    name: SpotifyETLs.track,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.highPriorityCron,
    priority: 3,
    enabled: true,
  },
  {
    name: XETLs.tweet,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.highPriorityCron,
    priority: 3,
    enabled: true,
  },
  {
    name: GitHubETLs.repository,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.mediumPriorityCron,
    priority: 3,
    enabled: true,
  },
  {
    name: GitHubETLs.pullRequest,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.mediumPriorityCron,
    priority: 3,
    enabled: true,
  },
  {
    name: LinearETLs.issue,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.mediumPriorityCron,
    priority: 3,
    enabled: true,
  },
  {
    name: SpotifyETLs.artist,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.mediumPriorityCron,
    priority: 3,
    enabled: true,
  },
  {
    name: SpotifyETLs.playlist,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.mediumPriorityCron,
    priority: 3,
    enabled: true,
  },

  {
    name: SpotifyETLs.album,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.lowPriorityCron,
    priority: 3,
    enabled: true,
  },
  {
    name: NotionETLs.page,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.lowPriorityCron,
    priority: 3,
    enabled: true,
  },
  {
    name: GitHubETLs.commit,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.mediumPriorityCron,
    priority: 3,
    enabled: true,
  },
  {
    name: GoogleCalendarETLs.event,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.mediumPriorityCron,
    priority: 2,
    enabled: true,
  },
  {
    name: GoogleYouTubeETLs.subscription,
    options: { limit: scheduleConfig.batchSize },
    cronExpression: scheduleConfig.mediumPriorityCron,
    priority: 2,
    enabled: true,
  },
].filter((job) => job.enabled !== false);

class SchedulerEntrypoint {
  public scheduler: Scheduler;

  constructor(redisConfig: IRedisConfig, concurrency?: number) {
    this.scheduler = new Scheduler({
      queueName: "etl-scheduler",
      redisConfig,
      concurrency: concurrency || 2,
    });
  }

  async scheduleJobs(): Promise<void> {
    const defaultCronExpression = "0 0 * * *"; // Daily at midnight

    logger.info("🧹 Cleaning up old scheduled jobs...");
    await this.scheduler.removeAllRepeatableJobs();

    for (const job of SCHEDULED_JOBS) {
      await this.scheduler.scheduleJob(
        job.name,
        job.options,
        job.cronExpression || defaultCronExpression,
        job.priority,
      );
    }

    logger.info(`📅 Scheduled ${SCHEDULED_JOBS.length} jobs with priorities`);
  }

  async runJobsManually(): Promise<void> {
    logger.info("🔧 Running jobs manually...");

    const sortedJobs = [...SCHEDULED_JOBS].sort((a, b) => (a.priority || 99) - (b.priority || 99));

    for (const job of sortedJobs) {
      logger.info(`⏳ Starting ${job.name} (priority: ${job.priority || "default"})...`);
      await this.scheduler.addJob(job.name, job.options, { priority: job.priority });
    }

    logger.info("✅ All manual jobs queued");
  }

  async start(): Promise<void> {
    await this.scheduler.start();
    logger.info("🚀 ETL Scheduler started successfully");
  }

  async stop(): Promise<void> {
    await this.scheduler.stop();
    logger.info("👋 ETL Scheduler stopped successfully");
  }
}

async function main() {
  try {
    dotenv.config();
    if (process.env.NODE_ENV === "test") {
      dotenv.config({ path: ".env.test", override: true });
    }

    schedulerETLTaskManager.registerTasks();

    const redisConfig: IRedisConfig = {
      url: process.env.REDIS_URL || "redis://localhost:6379",
    };

    const concurrency = Number.parseInt(process.env.ETL_CONCURRENCY || "2", 10);
    const schedulerEntrypoint = new SchedulerEntrypoint(redisConfig, concurrency);

    schedulerETLTaskManager.setScheduler(schedulerEntrypoint.scheduler);

    logger.info(`⚙️  Scheduler configuration:
      - Environment: ${process.env.NODE_ENV || "development"}
      - Concurrency: ${concurrency}
      - Batch Size: ${scheduleConfig.batchSize}
      - Scheduled Jobs: ${SCHEDULED_JOBS.length}
    `);

    // Handle command line arguments
    const args = process.argv.slice(2);
    const isManualRun = args.includes("--manual");

    if (isManualRun) {
      await schedulerEntrypoint.runJobsManually();

      logger.info("🔒 Closing database connections...");
      await closePostgresConnection();

      process.exit(0);
    }

    // Schedule and start regular jobs
    await schedulerEntrypoint.scheduleJobs();
    await schedulerEntrypoint.start();

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`📥 Received ${signal}. Shutting down...`);
      await schedulerEntrypoint.stop();

      logger.info("🔒 Closing database connections...");
      await closePostgresConnection();

      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error("💥 Failed to start ETL Scheduler:", { error });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SchedulerEntrypoint };

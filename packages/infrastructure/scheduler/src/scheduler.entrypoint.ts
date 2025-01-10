import dotenv from "dotenv";
import { Scheduler } from "./scheduler.service";
import type { IRedisConfig } from "@ait/redis";
import { GitHubETLs, SpotifyETLs } from "@ait/retove";
import { schedulerETLTaskManager } from "./task-manager/scheduler.etl.task-manager";

interface JobConfig {
  name: string;
  options: Record<string, unknown>;
}

const SCHEDULED_JOBS: JobConfig[] = [
  { name: GitHubETLs.repository, options: { limit: 10 } },
  { name: SpotifyETLs.track, options: { limit: 10 } },
];

class SchedulerEntrypoint {
  private scheduler: Scheduler;

  constructor(redisConfig: IRedisConfig) {
    this.scheduler = new Scheduler({
      queueName: "etl-scheduler",
      redisConfig,
    });
  }

  async scheduleJobs(): Promise<void> {
    const cronExpression = "0 0 * * *"; // Daily at midnight

    await Promise.all(SCHEDULED_JOBS.map((job) => this.scheduler.scheduleJob(job.name, job.options, cronExpression)));
  }

  async runJobsManually(): Promise<void> {
    await Promise.all(SCHEDULED_JOBS.map((job) => this.scheduler.addJob(job.name, job.options)));
  }

  async start(): Promise<void> {
    await this.scheduler.start();
    console.info("🚀 ETL Scheduler started successfully");
  }

  async stop(): Promise<void> {
    await this.scheduler.stop();
    console.info("👋 ETL Scheduler stopped successfully");
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
      maxRetriesPerRequest: null,
    };

    const schedulerEntrypoint = new SchedulerEntrypoint(redisConfig);

    // Handle command line arguments
    const args = process.argv.slice(2);
    const isManualRun = args.includes("--manual");

    if (isManualRun) {
      await schedulerEntrypoint.runJobsManually();
      process.exit(0);
    }

    // Schedule and start regular jobs
    await schedulerEntrypoint.scheduleJobs();
    await schedulerEntrypoint.start();

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.info(`📥 Received ${signal}. Shutting down...`);
      await schedulerEntrypoint.stop();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("💥 Failed to start ETL Scheduler:", error);
    process.exit(1);
  }
}

// Allow both manual and scheduled execution
if (require.main === module) {
  main();
}

export { SchedulerEntrypoint };

import { type Job, Queue, Worker, QueueEvents, type JobsOptions } from "bullmq";
import { getRedisClient, initRedisClient, type IRedisConfig } from "@ait/redis";
import { schedulerRegistry } from "./registry/scheduler.etl.registry";
import type { IScheduler } from "./scheduler.interface";

export class SchedulerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchedulerError";
  }
}

export interface ISchedulerConfig {
  queueName: string;
  redisConfig: IRedisConfig;
}

export class Scheduler implements IScheduler {
  private readonly _queue: Queue;
  private readonly _worker: Worker;
  private readonly _queueEvents: QueueEvents;
  private readonly _client: ReturnType<typeof getRedisClient>;

  constructor(config: ISchedulerConfig) {
    if (!config.queueName?.trim()) {
      throw new SchedulerError("Queue name is required");
    }

    this._client = this._initializeRedis(config.redisConfig);
    this._queue = this._initializeQueue(config.queueName);
    this._worker = this._initializeWorker(config.queueName);
    this._queueEvents = this._initializeQueueEvents(config.queueName);

    this._setupEventHandlers();
  }

  public async scheduleJob(
    jobName: string,
    data: Record<string, unknown>,
    cronExpression: string
  ): Promise<void> {
    if (!schedulerRegistry.has(jobName)) {
      throw new SchedulerError(
        `Cannot schedule unknown task: ${jobName}. Available tasks: ${schedulerRegistry.list().join(", ")}`
      );
    }

    await this._queue.add(jobName, data, {
      repeat: { pattern: cronExpression },
      jobId: `${jobName}-${Date.now()}`,
    });

    console.info(`[Scheduler] Job "${jobName}" scheduled with cron: ${cronExpression}`);
  }

  public async addJob(
    jobName: string,
    data: Record<string, unknown>,
    options?: JobsOptions
  ): Promise<void> {
    if (!schedulerRegistry.has(jobName)) {
      throw new SchedulerError(
        `Cannot add unknown task: ${jobName}. Available tasks: ${schedulerRegistry.list().join(", ")}`
      );
    }

    await this._queue.add(jobName, data, {
      ...options,
      jobId: `${jobName}-${Date.now()}`,
    });

    console.info(
      `[Scheduler] One-time job "${jobName}" added`,
      options ? `with options: ${JSON.stringify(options)}` : ""
    );
  }

  public async start(): Promise<void> {
    console.info("[Scheduler] Starting scheduler...");
    console.info(`[Scheduler] Available tasks: ${schedulerRegistry.list().join(", ")}`);
  }

  public async stop(): Promise<void> {
    console.info("[Scheduler] Stopping scheduler...");

    await Promise.all([
      this._worker.close(),
      this._queue.close(),
      this._queueEvents.close()
    ]);

    console.info("[Scheduler] Scheduler stopped");
  }

  // Private Methods

  private _initializeRedis(redisConfig: IRedisConfig) {
    initRedisClient(redisConfig);
    return getRedisClient();
  }

  private _initializeQueue(queueName: string): Queue {
    return new Queue(queueName, {
      connection: this._client,
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    });
  }

  private _initializeWorker(queueName: string): Worker {
    return new Worker(
      queueName,
      async (job: Job) => {
        try {
          console.info(`[Worker] Running job: ${job.name}`);
          const handler = schedulerRegistry.get(job.name);
          await handler(job.data);
        } catch (error) {
          console.error(`[Worker] Job execution failed: ${job.name}`, error);
          throw error;
        }
      },
      { connection: this._client }
    );
  }

  private _initializeQueueEvents(queueName: string): QueueEvents {
    return new QueueEvents(queueName, {
      connection: this._client,
    });
  }

  private _setupEventHandlers(): void {
    this._worker
      .on("completed", (job) => {
        console.info(`[Worker] Job completed: ${job.name}`);
      })
      .on("failed", (job, error) => {
        if (job) {
          console.error(
            `[Worker] Job failed: ${job.name}`,
            "\nError:", error,
            "\nAttempt:", job.attemptsMade,
            "\nData:", job.data
          );
        } else {
          console.error("[Worker] Job failed: unknown job", error);
        }
      })
      .on("error", (error) => {
        console.error("[Worker] Error:", error);
      });

    this._queueEvents
      .on("completed", ({ jobId }) => {
        console.debug(`[Queue] Job ${jobId} completed`);
      })
      .on("failed", ({ jobId, failedReason }) => {
        console.error(`[Queue] Job ${jobId} failed:`, failedReason);
      })
      .on("error", (error) => {
        console.error("[Queue] Error:", error);
      });
  }
}

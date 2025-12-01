import { type Job, Queue, Worker, QueueEvents, type JobsOptions } from "bullmq";
import type { IRedisConfig } from "@ait/redis";
import { schedulerRegistry } from "./registry/scheduler.etl.registry";
import { getLogger } from "@ait/core";

const logger = getLogger();

export class SchedulerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchedulerError";
  }
}

export interface ISchedulerConfig {
  queueName: string;
  redisConfig: IRedisConfig;
  concurrency?: number;
}

export class Scheduler implements IScheduler {
  private readonly _queue: Queue;
  private readonly _worker: Worker;
  private readonly _queueEvents: QueueEvents;
  private readonly _redisUrl: string;
  private readonly _concurrency: number;

  constructor(config: ISchedulerConfig) {
    if (!config.queueName?.trim()) {
      throw new SchedulerError("Queue name is required");
    }

    this._concurrency = config.concurrency || 2; // Default to 2 concurrent jobs
    this._redisUrl = config.redisConfig.url;
    this._queue = this._initializeQueue(config.queueName);
    this._worker = this._initializeWorker(config.queueName);
    this._queueEvents = this._initializeQueueEvents(config.queueName);

    this._setupEventHandlers();
  }

  public async scheduleJob(
    jobName: string,
    data: Record<string, unknown>,
    cronExpression: string,
    priority?: number,
  ): Promise<void> {
    if (!schedulerRegistry.has(jobName)) {
      throw new SchedulerError(
        `Cannot schedule unknown task: ${jobName}. Available tasks: ${schedulerRegistry.list().join(", ")}`,
      );
    }

    await this.removeRepeatableJob(jobName, cronExpression);

    await this._queue.add(jobName, data, {
      repeat: { pattern: cronExpression },
      priority: priority || 0,
      jobId: `${jobName}-repeatable`,
    });
  }

  public async removeRepeatableJob(jobName: string, cronExpression: string): Promise<void> {
    try {
      const jobSchedulers = await this._queue.getJobSchedulers();
      const jobToRemove = jobSchedulers.find(
        (scheduler) => scheduler.name === jobName && scheduler.pattern === cronExpression,
      );

      if (jobToRemove?.id) {
        await this._queue.removeJobScheduler(jobToRemove.id);
        logger.info(`[Scheduler] Removed repeatable job: ${jobName} (${cronExpression})`);
      }
    } catch (error) {
      logger.warn(`[Scheduler] Failed to remove repeatable job ${jobName}:`, { error });
    }
  }

  public async removeAllRepeatableJobs(): Promise<void> {
    try {
      const jobSchedulers = await this._queue.getJobSchedulers();
      for (const scheduler of jobSchedulers) {
        if (scheduler.id) {
          await this._queue.removeJobScheduler(scheduler.id);
          logger.info(`[Scheduler] Removed repeatable job: ${scheduler.name} (${scheduler.pattern})`);
        }
      }
      logger.info(`[Scheduler] Removed ${jobSchedulers.length} repeatable jobs`);
    } catch (error) {
      logger.warn("[Scheduler] Failed to remove repeatable jobs:", { error });
    }
  }

  public async addJob(jobName: string, data: Record<string, unknown>, options?: JobsOptions): Promise<void> {
    if (!schedulerRegistry.has(jobName)) {
      throw new SchedulerError(
        `Cannot add unknown task: ${jobName}. Available tasks: ${schedulerRegistry.list().join(", ")}`,
      );
    }

    await this._queue.add(jobName, data, {
      ...options,
      jobId: `${jobName}-${Date.now()}`,
    });

    logger.info(
      `[Scheduler] One-time job "${jobName}" added`,
      { options: options ? JSON.stringify(options) : "" },
    );
  }

  public async start(): Promise<void> {
    logger.info("[Scheduler] Starting scheduler...");
    logger.info(`[Scheduler] Available tasks: ${schedulerRegistry.list().join(", ")}`);
  }

  public async stop(): Promise<void> {
    logger.info("[Scheduler] Stopping scheduler...");

    await Promise.all([this._worker.close(), this._queue.close(), this._queueEvents.close()]);

    logger.info("[Scheduler] Scheduler stopped");
  }

  // Private Methods

  private _initializeQueue(queueName: string): Queue {
    return new Queue(queueName, {
      connection: { url: this._redisUrl, maxRetriesPerRequest: null },
      defaultJobOptions: {
        removeOnComplete: {
          age: 3600,
          count: 100,
        },
        removeOnFail: {
          age: 86400,
        },
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });
  }

  private _initializeWorker(queueName: string): Worker {
    return new Worker(
      queueName,
      async (job: Job) => {
        const startTime = Date.now();
        try {
          logger.info(`[Worker] Running job: ${job.name} (priority: ${job.opts.priority || 0})`);
          const handler = schedulerRegistry.get(job.name);
          await handler(job.data);
          const duration = Date.now() - startTime;
          logger.info(`[Worker] Job completed: ${job.name} (${duration}ms)`);
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`[Worker] Job execution failed: ${job.name} (${duration}ms)`, { error });
          throw error;
        }
      },
      {
        connection: { url: this._redisUrl, maxRetriesPerRequest: null },
        concurrency: this._concurrency,
        limiter: {
          max: 10,
          duration: 60000,
        },
      },
    );
  }

  private _initializeQueueEvents(queueName: string): QueueEvents {
    return new QueueEvents(queueName, {
      connection: { url: this._redisUrl, maxRetriesPerRequest: null },
    });
  }

  private _setupEventHandlers(): void {
    this._worker
      .on("completed", (job) => {
        logger.info(`[Worker] Job completed: ${job.name}`);
      })
      .on("failed", (job, error) => {
        if (job) {
          logger.error(
            `[Worker] Job failed: ${job.name}`,
            { error: error.message, attemptsMade: job.attemptsMade, data: job.data },
          );
        } else {
          logger.error("[Worker] Job failed: unknown job", { error: error.message });
        }
      })
      .on("error", (error) => {
        logger.error("[Worker] Error:", { error: error.message });
      });

    this._queueEvents
      .on("completed", ({ jobId }) => {
        logger.debug(`[Queue] Job ${jobId} completed`);
      })
      .on("failed", ({ jobId, failedReason }) => {
        logger.error(`[Queue] Job ${jobId} failed:`, { failedReason });
      })
      .on("error", (error) => {
        logger.error("[Queue] Error:", { error: error.message });
      });
  }
}

export interface IScheduler {
  scheduleJob(jobName: string, data: Record<string, any>, cronExpression: string, priority?: number): Promise<void>;
  addJob(
    jobName: string,
    data: Record<string, any>,
    options?: { delay?: number; repeat?: Record<string, any>; priority?: number },
  ): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

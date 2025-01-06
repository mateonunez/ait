import { Queue, Worker, type Job } from "bullmq";
import { SchedulerTaskRegistry } from "./registry/scheduler.etl.registry";
import type { IScheduler } from "./scheduler.interface";

export class Scheduler implements IScheduler {
  private _queue: Queue;
  private _worker: Worker;

  constructor(queueName: string, redisConfig: Record<string, any>) {
    this._queue = new Queue(queueName, { connection: redisConfig });

    this._worker = new Worker(
      queueName,
      async (job: Job) => {
        console.log(`[Worker] Running job: ${job.name}`);
        const taskHandler = SchedulerTaskRegistry.get(job.name);
        await taskHandler(job.data);
      },
      { connection: redisConfig },
    );
  }

  async scheduleJob(jobName: string, data: Record<string, any>, cronExpression: string): Promise<void> {
    await this._queue.add(jobName, data, {
      repeat: { pattern: cronExpression },
    });
    console.log(`[Scheduler] Job "${jobName}" scheduled with cron: ${cronExpression}`);
  }

  async addJob(jobName: string, data: Record<string, any>, options?: { delay?: number }): Promise<void> {
    await this._queue.add(jobName, data, options);
    console.log(`[Scheduler] One-time job "${jobName}" added with options:`, options);
  }

  async start(): Promise<void> {
    console.log("[Scheduler] Scheduler started");
    this._worker.on("completed", (job) => {
      console.log(`[Worker] Job completed: ${job.name}`);
    });
    this._worker.on("failed", (job, err) => {
      if (job) {
        console.error(`[Worker] Job failed: ${job.name}`, err);
      } else {
        console.error("[Worker] Job failed: unknown job", err);
      }
    });
  }

  async stop(): Promise<void> {
    await this._worker.close();
    await this._queue.close();
    console.log("[Scheduler] Scheduler stopped");
  }
}

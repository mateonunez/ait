export interface IScheduler {
  scheduleJob(jobName: string, data: Record<string, any>, cronExpression: string): Promise<void>;
  addJob(
    jobName: string,
    data: Record<string, any>,
    options?: { delay?: number; repeat?: Record<string, any> },
  ): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

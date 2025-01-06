export interface ISchedulerRegistry {
  tasks: Map<string, (data: Record<string, any>) => Promise<void>>;
  register(name: string, handler: (data: Record<string, any>) => Promise<void>): void;
  get(name: string): (data: Record<string, any>) => Promise<void>;
}

export const SchedulerTaskRegistry: ISchedulerRegistry = {
  tasks: new Map<string, (data: Record<string, any>) => Promise<void>>(),

  register(name: string, handler: (data: Record<string, any>) => Promise<void>): void {
    this.tasks.set(name, handler);
  },

  get(name: string): (data: Record<string, any>) => Promise<void> {
    const handler = this.tasks.get(name);
    if (!handler) {
      throw new Error(`Handler not found for task: ${name}`);
    }

    return handler;
  },
};

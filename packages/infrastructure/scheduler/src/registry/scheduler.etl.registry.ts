export interface ISchedulerRegistry {
  tasks: Map<string, (data: Record<string, unknown>) => Promise<void>>;
  register(name: string, handler: (data: Record<string, unknown>) => Promise<void>): void;
  unregister(name: string): void;
  get(name: string): (data: Record<string, unknown>) => Promise<void>;
}

export const SchedulerTaskRegistry: ISchedulerRegistry = {
  tasks: new Map<string, (data: Record<string, unknown>) => Promise<void>>(),

  register(name: string, handler: (data: Record<string, unknown>) => Promise<void>): void {
    if (this.tasks.has(name)) {
      this.tasks.set(name, handler);
    }

    console.info(`Task registered: ${name}`);
  },

  unregister(name: string): void {
    if (this.tasks.has(name)) {
      this.tasks.delete(name);
    }

    console.info(`Task unregistered: ${name}`);
  },

  get(name: string): (data: Record<string, unknown>) => Promise<void> {
    const handler = this.tasks.get(name);
    if (!handler) {
      console.warn('tasks', this.tasks);
      throw new Error(`Handler not found for task: ${name}`);
    }

    return handler;
  },
};

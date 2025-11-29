type TaskHandler = (data: Record<string, unknown>) => Promise<void>;

export class TaskRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskRegistryError";
  }
}

export interface ISchedulerTaskRegistry {
  register(name: string, handler: TaskHandler): void;
  get(name: string): TaskHandler;
  has(name: string): boolean;
  list(): string[];
}

export class SchedulerTaskRegistry implements ISchedulerTaskRegistry {
  private static instance: SchedulerTaskRegistry;
  private readonly _tasks: Map<string, TaskHandler>;

  private constructor() {
    this._tasks = new Map();
  }

  public static getInstance(): SchedulerTaskRegistry {
    if (!SchedulerTaskRegistry.instance) {
      SchedulerTaskRegistry.instance = new SchedulerTaskRegistry();
    }
    return SchedulerTaskRegistry.instance;
  }

  public register(name: string, handler: TaskHandler): void {
    if (!name?.trim()) {
      throw new TaskRegistryError("Task name is required");
    }

    if (!handler || typeof handler !== "function") {
      throw new TaskRegistryError("Task handler must be a function");
    }

    this._tasks.set(name, handler);
    logger.info(`Task registered: ${name}`);
    logger.debug("Available tasks:", Array.from(this._tasks.keys()));
  }

  public get(name: string): TaskHandler {
    const handler = this._tasks.get(name);
    if (!handler) {
      throw new TaskRegistryError(`Handler not found for task: ${name}`);
    }
    return handler;
  }

  public has(name: string): boolean {
    return this._tasks.has(name);
  }

  public list(): string[] {
    return Array.from(this._tasks.keys());
  }
}

export const schedulerRegistry = SchedulerTaskRegistry.getInstance();

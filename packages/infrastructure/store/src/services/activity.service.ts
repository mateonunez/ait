import { type ActivityData, getLogger } from "@ait/core";
import { type IActivityRepository, getActivityRepository } from "../repositories/activity.repository";

const logger = getLogger();

export interface IActivityService {
  getActivityData(range: "week" | "month" | "year", userId: string): Promise<ActivityData>;
}

export class ActivityService implements IActivityService {
  private _repository: IActivityRepository;

  constructor(repository?: IActivityRepository) {
    this._repository = repository || getActivityRepository();
  }

  async getActivityData(range: "week" | "month" | "year", userId: string): Promise<ActivityData> {
    logger.info(`[ActivityService] Fetching activity data for range: ${range}, user: ${userId}`);
    return this._repository.getActivityData(range, userId);
  }
}

let instance: ActivityService | null = null;

export function getActivityService(): ActivityService {
  if (!instance) {
    instance = new ActivityService();
  }
  return instance;
}

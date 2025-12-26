import {
  type ActivityData,
  type CreateGoalRequest,
  type GoalData,
  type GoalSummary,
  type GoalType,
  type IntegrationVendor,
  type UpdateGoalRequest,
  getLogger,
} from "@ait/core";
import type { GoalInsert } from "@ait/postgres";
import { type IGoalRepository, getGoalRepository } from "../repositories/goal.repository";

const logger = getLogger();

export type IntegrationVendorWithYoutube = IntegrationVendor | "youtube";

export class GoalService {
  private _repository: IGoalRepository;

  constructor(repository?: IGoalRepository) {
    this._repository = repository || getGoalRepository();
  }

  async createGoal(userId: string, request: CreateGoalRequest): Promise<GoalData> {
    const data: GoalInsert = {
      userId,
      type: request.type,
      target: request.target,
      period: request.period,
      label: request.label,
      icon: request.icon,
    };
    const record = await this._repository.createGoal(data);
    logger.info(`[GoalService] Goal created: ${record.id} for user: ${userId}`);
    return record;
  }

  async getGoals(userId: string): Promise<GoalData[]> {
    return this._repository.getGoals(userId);
  }

  async getGoal(id: string, userId: string): Promise<GoalData | null> {
    return this._repository.getGoal(id, userId);
  }

  async updateGoal(id: string, userId: string, updates: UpdateGoalRequest): Promise<GoalData | null> {
    const record = await this._repository.updateGoal(id, userId, updates);
    if (record) {
      logger.info(`[GoalService] Goal updated: ${id} for user: ${userId}`);
    }
    return record;
  }

  async deleteGoal(id: string, userId: string): Promise<boolean> {
    const success = await this._repository.deleteGoal(id, userId);
    if (success) {
      logger.info(`[GoalService] Goal deleted: ${id} for user: ${userId}`);
    }
    return success;
  }

  async updateProgress(id: string, current: number, userId: string): Promise<GoalData | null> {
    const record = await this._repository.updateProgress(id, current, userId);
    if (record) {
      logger.debug(`[GoalService] Progress updated for goal: ${id}, current: ${current}`);
    }
    return record;
  }

  async getSummary(userId: string): Promise<GoalSummary> {
    return this._repository.getSummary(userId);
  }

  async updateAllProgress(activityData: ActivityData, userId: string): Promise<GoalData[]> {
    logger.info(`[GoalService] Starting bulk progress update for user: ${userId}`);
    const goals = await this._repository.getGoals(userId);
    const updatedGoals: GoalData[] = [];

    const activityCounts = this.mapActivityDataToGoalCounts(activityData);

    for (const goal of goals) {
      const activityCount = activityCounts[goal.type];

      if (activityCount !== undefined) {
        const updated = await this._repository.updateProgress(goal.id, activityCount, userId);
        if (updated) {
          updatedGoals.push(updated);
        }
      }
    }

    logger.info(`[GoalService] Bulk progress update complete. Updated ${updatedGoals.length} goals.`);
    return updatedGoals;
  }

  private mapActivityDataToGoalCounts(activityData: ActivityData): Partial<Record<GoalType, number>> {
    const counts: Partial<Record<GoalType, number>> = {};

    const mapping: Record<IntegrationVendorWithYoutube, GoalType[]> = {
      github: ["commit", "commits"],
      spotify: ["recently_played", "songs", "track"],
      slack: ["message", "messages"],
      x: ["tweet", "tweets"],
      linear: ["issue", "tasks"],
      notion: ["page", "documents"],
      google: ["event", "meetings"],
      youtube: ["subscription"],
    };

    for (const [vendor, goalTypes] of Object.entries(mapping)) {
      const activity = activityData[vendor as IntegrationVendor];
      if (activity) {
        const count = activity.total || 0;
        for (const goalType of goalTypes) {
          counts[goalType] = count;
        }
      }
    }

    logger.debug(`[GoalService] Activity data mapped to ${Object.keys(counts).length} goal types`);
    return counts;
  }
}

let instance: GoalService | null = null;

export function getGoalService(): GoalService {
  if (!instance) {
    instance = new GoalService();
  }
  return instance;
}

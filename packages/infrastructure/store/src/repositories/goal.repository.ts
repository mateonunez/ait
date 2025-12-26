import {
  type GoalData,
  type GoalPeriod,
  type GoalSummary,
  type GoalType,
  type UpdateGoalRequest,
  getLogger,
} from "@ait/core";
import { type GoalInsert, type GoalSelect, drizzleOrm, getPostgresClient, goals } from "@ait/postgres";

const logger = getLogger();
const pgClient = getPostgresClient();

export interface IGoalRepository {
  createGoal(data: GoalInsert): Promise<GoalData>;
  getGoals(userId: string): Promise<GoalData[]>;
  getGoal(id: string, userId: string): Promise<GoalData | null>;
  updateGoal(id: string, userId: string, updates: UpdateGoalRequest): Promise<GoalData | null>;
  deleteGoal(id: string, userId: string): Promise<boolean>;
  updateProgress(id: string, current: number, userId: string): Promise<GoalData | null>;
  getSummary(userId: string): Promise<GoalSummary>;
}

export class GoalRepository implements IGoalRepository {
  async createGoal(data: GoalInsert): Promise<GoalData> {
    const [record] = await pgClient.db.insert(goals).values(data).returning();
    logger.info(`[GoalRepository] Created goal: ${record!.id} for user: ${record!.userId}`);
    return this._mapSelectToData(record!);
  }

  async getGoals(userId: string): Promise<GoalData[]> {
    const results = await pgClient.db
      .select()
      .from(goals)
      .where(drizzleOrm.eq(goals.userId, userId))
      .orderBy(drizzleOrm.desc(goals.createdAt))
      .execute();

    return results.map((r) => this._mapSelectToData(r));
  }

  async getGoal(id: string, userId: string): Promise<GoalData | null> {
    const [record] = await pgClient.db
      .select()
      .from(goals)
      .where(drizzleOrm.and(drizzleOrm.eq(goals.id, id), drizzleOrm.eq(goals.userId, userId)))
      .execute();
    return record ? this._mapSelectToData(record) : null;
  }

  async updateGoal(id: string, userId: string, updates: UpdateGoalRequest): Promise<GoalData | null> {
    const [record] = await pgClient.db
      .update(goals)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(drizzleOrm.and(drizzleOrm.eq(goals.id, id), drizzleOrm.eq(goals.userId, userId)))
      .returning();

    return record ? this._mapSelectToData(record) : null;
  }

  async deleteGoal(id: string, userId: string): Promise<boolean> {
    const result = await pgClient.db
      .delete(goals)
      .where(drizzleOrm.and(drizzleOrm.eq(goals.id, id), drizzleOrm.eq(goals.userId, userId)))
      .returning();

    return result.length > 0;
  }

  async updateProgress(id: string, current: number, userId: string): Promise<GoalData | null> {
    const goal = await pgClient.db
      .select()
      .from(goals)
      .where(drizzleOrm.and(drizzleOrm.eq(goals.id, id), drizzleOrm.eq(goals.userId, userId)))
      .execute();

    if (!goal[0]) return null;
    const currentGoal = goal[0];

    const progress = Math.min(Math.round((current / currentGoal.target) * 100), 100);

    let newStreak = currentGoal.streak;
    if (progress >= 100 && currentGoal.progress < 100) {
      newStreak += 1;
    }

    const [updated] = await pgClient.db
      .update(goals)
      .set({
        current,
        progress,
        streak: newStreak,
        updatedAt: new Date(),
      })
      .where(drizzleOrm.and(drizzleOrm.eq(goals.id, id), drizzleOrm.eq(goals.userId, userId)))
      .returning();

    return updated ? this._mapSelectToData(updated) : null;
  }

  async getSummary(userId: string): Promise<GoalSummary> {
    const userGoals = await pgClient.db.select().from(goals).where(drizzleOrm.eq(goals.userId, userId)).execute();

    if (userGoals.length === 0) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        averageProgress: 0,
        longestStreak: 0,
      };
    }

    const completed = userGoals.filter((g) => g.progress >= 100).length;
    const inProgress = userGoals.filter((g) => g.progress > 0 && g.progress < 100).length;
    const averageProgress = Math.round(userGoals.reduce((sum, g) => sum + g.progress, 0) / userGoals.length);
    const longestStreak = Math.max(...userGoals.map((g) => g.streak), 0);

    return {
      total: userGoals.length,
      completed,
      inProgress,
      averageProgress,
      longestStreak,
    };
  }

  private _mapSelectToData(record: GoalSelect): GoalData {
    return {
      id: record.id,
      type: record.type as GoalType,
      target: record.target,
      period: record.period as GoalPeriod,
      current: record.current,
      progress: record.progress,
      streak: record.streak,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      label: record.label || undefined,
      icon: record.icon || undefined,
    };
  }
}

let instance: GoalRepository | null = null;
export function getGoalRepository(): IGoalRepository {
  if (!instance) {
    instance = new GoalRepository();
  }
  return instance;
}

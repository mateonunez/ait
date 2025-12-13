import { randomUUID } from "node:crypto";
import { getLogger } from "@ait/core";
import type { CreateGoalRequest, GoalData, GoalType, UpdateGoalRequest } from "./insights.types";
import type { ActivityData } from "./insights.types";
import { getIntegrationRegistryService } from "./integration-registry.service";

const logger = getLogger();

/**
 * Redis key patterns for goal storage
 */
const KEYS = {
  goals: (userId: string) => `goals:user:${userId}:list`,
  goal: (userId: string, goalId: string) => `goals:user:${userId}:goal:${goalId}`,
  progress: (userId: string, goalId: string) => `goals:user:${userId}:progress:${goalId}`,
  streak: (userId: string, goalId: string) => `goals:user:${userId}:streak:${goalId}`,
};

/**
 * Goal tracking service with Redis storage
 */
export class GoalTrackingService {
  private redisClient: any; // Redis client instance
  private defaultUserId: string;
  private registry = getIntegrationRegistryService();

  constructor(redisClient: any, userId = "default") {
    this.redisClient = redisClient;
    this.defaultUserId = userId;
  }

  /**
   * Create a new goal
   */
  async createGoal(request: CreateGoalRequest, userId?: string): Promise<GoalData> {
    const uid = userId || this.defaultUserId;
    const goalId = randomUUID();

    const goal: GoalData = {
      id: goalId,
      type: request.type,
      target: request.target,
      period: request.period,
      current: 0,
      progress: 0,
      streak: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      label: request.label,
      icon: request.icon || this.getDefaultIcon(request.type),
    };

    // Store goal
    await this.redisClient.set(KEYS.goal(uid, goalId), JSON.stringify(goal));

    // Add to goals list
    await this.redisClient.sadd(KEYS.goals(uid), goalId);

    logger.info("Goal created", { userId: uid, goalId, type: request.type });

    return goal;
  }

  /**
   * Get all goals for a user
   */
  async getGoals(userId?: string): Promise<GoalData[]> {
    const uid = userId || this.defaultUserId;

    const goalIds = await this.redisClient.smembers(KEYS.goals(uid));

    if (!goalIds || goalIds.length === 0) {
      return [];
    }

    const goals: GoalData[] = [];

    for (const goalId of goalIds) {
      const goalData = await this.redisClient.get(KEYS.goal(uid, goalId));
      if (goalData) {
        goals.push(JSON.parse(goalData));
      }
    }

    return goals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get a specific goal
   */
  async getGoal(goalId: string, userId?: string): Promise<GoalData | null> {
    const uid = userId || this.defaultUserId;

    const goalData = await this.redisClient.get(KEYS.goal(uid, goalId));

    if (!goalData) {
      return null;
    }

    return JSON.parse(goalData);
  }

  /**
   * Update a goal
   */
  async updateGoal(goalId: string, updates: UpdateGoalRequest, userId?: string): Promise<GoalData | null> {
    const uid = userId || this.defaultUserId;

    const existingGoal = await this.getGoal(goalId, uid);

    if (!existingGoal) {
      logger.warn("Goal not found for update", { userId: uid, goalId });
      return null;
    }

    const updatedGoal: GoalData = {
      ...existingGoal,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.redisClient.set(KEYS.goal(uid, goalId), JSON.stringify(updatedGoal));

    logger.info("Goal updated", { userId: uid, goalId });

    return updatedGoal;
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string, userId?: string): Promise<boolean> {
    const uid = userId || this.defaultUserId;

    // Remove from goals list
    await this.redisClient.srem(KEYS.goals(uid), goalId);

    // Delete goal data
    await this.redisClient.del(KEYS.goal(uid, goalId));

    // Delete progress and streak data
    await this.redisClient.del(KEYS.progress(uid, goalId));
    await this.redisClient.del(KEYS.streak(uid, goalId));

    logger.info("Goal deleted", { userId: uid, goalId });

    return true;
  }

  /**
   * Update goal progress based on current activity
   */
  async updateProgress(goalId: string, currentActivity: number, userId?: string): Promise<GoalData | null> {
    const uid = userId || this.defaultUserId;

    const goal = await this.getGoal(goalId, uid);

    if (!goal) {
      return null;
    }

    // Calculate progress percentage
    const progress = Math.min(Math.round((currentActivity / goal.target) * 100), 100);

    // Update streak if goal completed
    let streak = goal.streak;
    if (progress >= 100) {
      streak = await this.incrementStreak(goalId, uid);
    }

    const updatedGoal: GoalData = {
      ...goal,
      current: currentActivity,
      progress,
      streak,
      updatedAt: new Date().toISOString(),
    };

    await this.redisClient.set(KEYS.goal(uid, goalId), JSON.stringify(updatedGoal));

    return updatedGoal;
  }

  /**
   * Bulk update progress for all goals based on activity data
   */
  async updateAllProgress(activityData: ActivityData, userId?: string): Promise<GoalData[]> {
    const uid = userId || this.defaultUserId;

    const goals = await this.getGoals(uid);
    const updatedGoals: GoalData[] = [];

    // Map goal types to activity counts from ActivityData
    const activityCounts = this.mapActivityDataToGoalCounts(activityData);

    for (const goal of goals) {
      const activityCount = activityCounts[goal.type];

      if (activityCount !== undefined) {
        const updated = await this.updateProgress(goal.id, activityCount, uid);
        if (updated) {
          updatedGoals.push(updated);
        }
      }
    }

    return updatedGoals;
  }

  /**
   * Map ActivityData to goal type counts
   * Maps connector goal types to EntityType values and backward compatibility aliases
   */
  private mapActivityDataToGoalCounts(activityData: ActivityData): Partial<Record<GoalType, number>> {
    const counts: Partial<Record<GoalType, number>> = {};

    // Map each connector type to its goal type(s)
    const connectorTypes = this.registry.getAvailableConnectorTypes();

    for (const connectorType of connectorTypes) {
      const goalType = this.registry.getGoalType(connectorType);
      if (!goalType) continue;

      const activity = activityData[connectorType];
      if (!activity) continue;

      const count = activity.total || 0;

      // Map goal type to EntityType and backward compatibility aliases
      const goalTypeMapping: Record<string, GoalType[]> = {
        commits: ["commit", "commits"],
        songs: ["recently_played", "songs"],
        messages: ["message", "messages"],
        tweets: ["tweet", "tweets"],
        tasks: ["issue", "tasks"],
        documents: ["page", "documents"],
      };

      const mappedTypes = goalTypeMapping[goalType] || [goalType as GoalType];

      for (const mappedType of mappedTypes) {
        counts[mappedType] = count;
      }
    }

    return counts;
  }

  /**
   * Increment streak for a goal
   */
  private async incrementStreak(goalId: string, userId: string): Promise<number> {
    const streakKey = KEYS.streak(userId, goalId);

    // Get current streak
    const currentStreak = await this.redisClient.get(streakKey);
    const newStreak = currentStreak ? Number.parseInt(currentStreak, 10) + 1 : 1;

    // Store new streak with expiry (based on goal period)
    await this.redisClient.set(streakKey, newStreak.toString());
    await this.redisClient.expire(streakKey, 60 * 60 * 24 * 7); // 7 days

    return newStreak;
  }

  /**
   * Reset streak for a goal
   */
  async resetStreak(goalId: string, userId?: string): Promise<void> {
    const uid = userId || this.defaultUserId;
    await this.redisClient.set(KEYS.streak(uid, goalId), "0");
  }

  /**
   * Check if goal was completed today/this period
   */
  async isGoalCompleted(goalId: string, userId?: string): Promise<boolean> {
    const uid = userId || this.defaultUserId;

    const goal = await this.getGoal(goalId, uid);

    if (!goal) {
      return false;
    }

    return goal.progress >= 100;
  }

  /**
   * Get goals summary statistics
   */
  async getGoalsSummary(userId?: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    averageProgress: number;
    longestStreak: number;
  }> {
    const goals = await this.getGoals(userId);

    if (goals.length === 0) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        averageProgress: 0,
        longestStreak: 0,
      };
    }

    const completed = goals.filter((g) => g.progress >= 100).length;
    const inProgress = goals.filter((g) => g.progress > 0 && g.progress < 100).length;
    const averageProgress = Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length);
    const longestStreak = Math.max(...goals.map((g) => g.streak), 0);

    return {
      total: goals.length,
      completed,
      inProgress,
      averageProgress,
      longestStreak,
    };
  }

  /**
   * Get default icon for goal type
   */
  private getDefaultIcon(type: GoalType): string {
    // Map EntityType values and backward compatibility aliases to icons
    const icons: Partial<Record<GoalType, string>> = {
      // EntityType values from core
      track: "🎵",
      artist: "🎤",
      playlist: "📀",
      album: "💿",
      recently_played: "🎵",
      repository: "📦",
      pull_request: "🔀",
      commit: "💻",
      issue: "📋",
      tweet: "🐦",
      page: "📄",
      message: "💬",
      // Backward compatibility aliases
      commits: "💻", // -> commit
      songs: "🎵", // -> recently_played
      tweets: "🐦", // -> tweet
      tasks: "✅", // -> issue
      documents: "📝", // -> page
    };

    return icons[type] || "🎯";
  }

  /**
   * Clean up old completed goals (optional maintenance)
   */
  async cleanupOldGoals(daysOld = 30, userId?: string): Promise<number> {
    const uid = userId || this.defaultUserId;

    const goals = await this.getGoals(uid);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deleted = 0;

    for (const goal of goals) {
      if (goal.progress >= 100 && new Date(goal.updatedAt) < cutoffDate) {
        await this.deleteGoal(goal.id, uid);
        deleted++;
      }
    }

    if (deleted > 0) {
      logger.info("Cleaned up old goals", { userId: uid, deleted });
    }

    return deleted;
  }
}

// Singleton instance (requires Redis client)
let _goalTrackingService: GoalTrackingService | null = null;

export function getGoalTrackingService(redisClient?: any, userId?: string): GoalTrackingService {
  if (!_goalTrackingService) {
    if (!redisClient) {
      throw new Error("Redis client required to initialize GoalTrackingService");
    }
    _goalTrackingService = new GoalTrackingService(redisClient, userId);
  }
  return _goalTrackingService;
}

export function resetGoalTrackingService(): void {
  _goalTrackingService = null;
}

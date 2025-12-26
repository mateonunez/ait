import { type FeedbackStats, type ListFeedbackOptions, type QualityTrendPoint, getLogger } from "@ait/core";
import { type FeedbackInsert, type FeedbackSelect, drizzleOrm, feedback, getPostgresClient } from "@ait/postgres";

const logger = getLogger();
const pgClient = getPostgresClient();

// Constants for default time windows and limits
export const DEFAULT_STATS_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const DEFAULT_TREND_BUCKET_MS = 60 * 60 * 1000; // 1 hour
export const DEFAULT_TREND_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
export const DEFAULT_PROBLEMATIC_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const DEFAULT_PROBLEMATIC_LIMIT = 10;
export const DEFAULT_LIST_LIMIT = 100;

export interface IFeedbackRepository {
  recordFeedback(data: FeedbackInsert): Promise<FeedbackSelect>;
  getFeedbackStats(windowMs?: number): Promise<FeedbackStats>;
  getQualityTrend(bucketSizeMs?: number, windowMs?: number): Promise<QualityTrendPoint[]>;
  listFeedback(options?: ListFeedbackOptions): Promise<FeedbackSelect[]>;
  getProblematicTraces(limit?: number, windowMs?: number): Promise<FeedbackSelect[]>;
  isQualityDegrading(): Promise<boolean>;
}

export class FeedbackRepository implements IFeedbackRepository {
  async recordFeedback(data: FeedbackInsert): Promise<FeedbackSelect> {
    const [record] = await pgClient.db.insert(feedback).values(data).returning();
    logger.info(`[FeedbackRepository] Recorded feedback: ${record!.id} for message: ${record!.messageId}`);
    return record!;
  }

  async getFeedbackStats(windowMs = DEFAULT_STATS_WINDOW_MS): Promise<FeedbackStats> {
    const cutoff = new Date(Date.now() - windowMs);
    const results = await pgClient.db
      .select()
      .from(feedback)
      .where(drizzleOrm.gt(feedback.createdAt, cutoff))
      .execute();

    const total = results.length;
    const thumbsUp = results.filter((f) => f.rating === "thumbs_up").length;
    const thumbsDown = results.filter((f) => f.rating === "thumbs_down").length;
    const neutral = results.filter((f) => f.rating === "neutral").length;

    const thumbsUpRate = total > 0 ? (thumbsUp / total) * 100 : 0;
    const rawScore = thumbsUp - thumbsDown;
    const qualityScore = total > 0 ? Math.max(0, Math.min(100, 50 + (rawScore / total) * 50)) : 50;

    return {
      total,
      thumbsUp,
      thumbsDown,
      neutral,
      thumbsUpRate,
      qualityScore,
    };
  }

  async getQualityTrend(
    bucketSizeMs = DEFAULT_TREND_BUCKET_MS,
    windowMs = DEFAULT_TREND_WINDOW_MS,
  ): Promise<QualityTrendPoint[]> {
    const cutoff = new Date(Date.now() - windowMs);
    const results = await pgClient.db
      .select()
      .from(feedback)
      .where(drizzleOrm.gt(feedback.createdAt, cutoff))
      .execute();

    const buckets = new Map<number, FeedbackSelect[]>();

    for (const record of results) {
      const bucket = Math.floor(record.createdAt.getTime() / bucketSizeMs) * bucketSizeMs;
      const existing = buckets.get(bucket) || [];
      existing.push(record);
      buckets.set(bucket, existing);
    }

    const trend: QualityTrendPoint[] = [];

    for (const [timestamp, feedbackList] of buckets.entries()) {
      const thumbsUpCount = feedbackList.filter((f) => f.rating === "thumbs_up").length;
      const thumbsDownCount = feedbackList.filter((f) => f.rating === "thumbs_down").length;
      const total = feedbackList.length;

      const rawScore = thumbsUpCount - thumbsDownCount;
      const score = total > 0 ? Math.max(0, Math.min(100, 50 + (rawScore / total) * 50)) : 50;

      trend.push({
        timestamp,
        score,
        totalFeedback: total,
        thumbsUpCount,
        thumbsDownCount,
      });
    }

    return trend.sort((a, b) => a.timestamp - b.timestamp);
  }

  async listFeedback(options: ListFeedbackOptions = {}): Promise<FeedbackSelect[]> {
    const { windowMs, rating, userId, sessionId, limit = DEFAULT_LIST_LIMIT, offset = 0 } = options;
    let query = pgClient.db.select().from(feedback);

    const conditions = [];
    if (windowMs) {
      conditions.push(drizzleOrm.gt(feedback.createdAt, new Date(Date.now() - windowMs)));
    }
    if (rating) {
      conditions.push(drizzleOrm.eq(feedback.rating, rating));
    }
    if (userId) {
      conditions.push(drizzleOrm.eq(feedback.userId, userId));
    }
    if (sessionId) {
      conditions.push(drizzleOrm.eq(feedback.sessionId, sessionId));
    }

    if (conditions.length > 0) {
      query = query.where(drizzleOrm.and(...conditions)) as any;
    }

    return await query.limit(limit).offset(offset).orderBy(drizzleOrm.desc(feedback.createdAt)).execute();
  }

  async getProblematicTraces(
    limit = DEFAULT_PROBLEMATIC_LIMIT,
    windowMs = DEFAULT_PROBLEMATIC_WINDOW_MS,
  ): Promise<FeedbackSelect[]> {
    const cutoff = new Date(Date.now() - windowMs);
    return await pgClient.db
      .select()
      .from(feedback)
      .where(drizzleOrm.and(drizzleOrm.gt(feedback.createdAt, cutoff), drizzleOrm.eq(feedback.rating, "thumbs_down")))
      .limit(limit)
      .orderBy(drizzleOrm.desc(feedback.createdAt))
      .execute();
  }

  async isQualityDegrading(): Promise<boolean> {
    const last5MinStats = await this.getFeedbackStats(5 * 60 * 1000);
    const last30MinStats = await this.getFeedbackStats(30 * 60 * 1000);

    if (last5MinStats.total < 5 || last30MinStats.total < 10) {
      return false;
    }

    return last5MinStats.qualityScore < last30MinStats.qualityScore - 15;
  }
}

let instance: FeedbackRepository | null = null;

export function getFeedbackRepository(): FeedbackRepository {
  if (!instance) {
    instance = new FeedbackRepository();
  }
  return instance;
}

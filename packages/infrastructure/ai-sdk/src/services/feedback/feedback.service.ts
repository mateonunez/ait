import { randomUUID } from "node:crypto";
import type {
  Feedback,
  FeedbackRating,
  FeedbackStats,
  QualityTrendPoint,
  ProblematicTrace,
  FeedbackMetadata,
} from "./types";

/**
 * Service for collecting and analyzing user feedback
 */
export class FeedbackService {
  private feedbackRecords: Feedback[] = [];
  private readonly maxRecords = 10000;

  /**
   * Record user feedback for a message/trace
   */
  recordFeedback(params: {
    traceId: string;
    messageId: string;
    rating: FeedbackRating;
    comment?: string;
    userId?: string;
    sessionId?: string;
    metadata?: FeedbackMetadata;
  }): Feedback {
    const feedback: Feedback = {
      feedbackId: randomUUID(),
      traceId: params.traceId,
      messageId: params.messageId,
      rating: params.rating,
      comment: params.comment,
      userId: params.userId,
      sessionId: params.sessionId,
      timestamp: Date.now(),
      metadata: params.metadata,
    };

    this.feedbackRecords.push(feedback);

    // Keep only recent records
    if (this.feedbackRecords.length > this.maxRecords) {
      this.feedbackRecords = this.feedbackRecords.slice(-this.maxRecords);
    }

    console.log("[Feedback] Recorded feedback", {
      feedbackId: feedback.feedbackId,
      traceId: feedback.traceId,
      rating: feedback.rating,
      hasComment: !!feedback.comment,
    });

    return feedback;
  }

  /**
   * Get feedback statistics for a time window
   */
  getFeedbackStats(windowMs = 60 * 60 * 1000): FeedbackStats {
    const cutoff = Date.now() - windowMs;
    const recentFeedback = this.feedbackRecords.filter((f) => f.timestamp > cutoff);

    const total = recentFeedback.length;
    const thumbsUp = recentFeedback.filter((f) => f.rating === "thumbs_up").length;
    const thumbsDown = recentFeedback.filter((f) => f.rating === "thumbs_down").length;
    const neutral = recentFeedback.filter((f) => f.rating === "neutral").length;

    const thumbsUpRate = total > 0 ? (thumbsUp / total) * 100 : 0;

    // Quality score: thumbs up worth +1, thumbs down worth -1, neutral worth 0
    // Normalized to 0-100 scale
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

  /**
   * Get feedback for a specific trace
   */
  getFeedbackByTrace(traceId: string): Feedback[] {
    return this.feedbackRecords.filter((f) => f.traceId === traceId);
  }

  /**
   * Get feedback for a specific message
   */
  getFeedbackByMessage(messageId: string): Feedback | undefined {
    return this.feedbackRecords.find((f) => f.messageId === messageId);
  }

  /**
   * Get traces with negative feedback
   */
  getProblematicTraces(limit = 10, windowMs = 60 * 60 * 1000): ProblematicTrace[] {
    const cutoff = Date.now() - windowMs;
    const negativeFeedback = this.feedbackRecords
      .filter((f) => f.timestamp > cutoff && f.rating === "thumbs_down")
      .map((f) => ({
        traceId: f.traceId,
        messageId: f.messageId,
        rating: f.rating,
        comment: f.comment,
        timestamp: f.timestamp,
        userId: f.userId,
        sessionId: f.sessionId,
        metadata: f.metadata,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    return negativeFeedback.slice(0, limit);
  }

  /**
   * Get quality trend over time
   */
  getQualityTrend(bucketSizeMs = 60 * 60 * 1000, windowMs = 24 * 60 * 60 * 1000): QualityTrendPoint[] {
    const cutoff = Date.now() - windowMs;
    const recentFeedback = this.feedbackRecords.filter((f) => f.timestamp > cutoff);

    // Group feedback by time buckets
    const buckets = new Map<number, Feedback[]>();

    for (const feedback of recentFeedback) {
      const bucket = Math.floor(feedback.timestamp / bucketSizeMs) * bucketSizeMs;
      const existing = buckets.get(bucket) || [];
      existing.push(feedback);
      buckets.set(bucket, existing);
    }

    // Calculate score for each bucket
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

  /**
   * Get all feedback with filtering
   */
  getAllFeedback(params?: {
    windowMs?: number;
    rating?: FeedbackRating;
    userId?: string;
    sessionId?: string;
  }): Feedback[] {
    let filtered = [...this.feedbackRecords];

    if (params?.windowMs) {
      const cutoff = Date.now() - params.windowMs;
      filtered = filtered.filter((f) => f.timestamp > cutoff);
    }

    if (params?.rating) {
      filtered = filtered.filter((f) => f.rating === params.rating);
    }

    if (params?.userId) {
      filtered = filtered.filter((f) => f.userId === params.userId);
    }

    if (params?.sessionId) {
      filtered = filtered.filter((f) => f.sessionId === params.sessionId);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get feedback count by rating
   */
  getCountByRating(windowMs?: number): Record<FeedbackRating, number> {
    const feedback = windowMs ? this.getAllFeedback({ windowMs }) : this.feedbackRecords;

    return {
      thumbs_up: feedback.filter((f) => f.rating === "thumbs_up").length,
      thumbs_down: feedback.filter((f) => f.rating === "thumbs_down").length,
      neutral: feedback.filter((f) => f.rating === "neutral").length,
    };
  }

  /**
   * Check if quality is degrading (comparing recent to historical)
   */
  isQualityDegrading(): boolean {
    const last5MinStats = this.getFeedbackStats(5 * 60 * 1000);
    const last30MinStats = this.getFeedbackStats(30 * 60 * 1000);

    // Need minimum feedback to make determination
    if (last5MinStats.total < 5 || last30MinStats.total < 10) {
      return false;
    }

    // Recent quality is significantly worse than historical
    const recentQuality = last5MinStats.qualityScore;
    const historicalQuality = last30MinStats.qualityScore;

    return recentQuality < historicalQuality - 15; // 15 point drop
  }

  /**
   * Reset all feedback data
   */
  reset(): void {
    this.feedbackRecords = [];
  }

  /**
   * Get total feedback count
   */
  getTotalFeedback(windowMs?: number): number {
    if (!windowMs) {
      return this.feedbackRecords.length;
    }

    const cutoff = Date.now() - windowMs;
    return this.feedbackRecords.filter((f) => f.timestamp > cutoff).length;
  }
}

// Singleton instance
let _feedbackService: FeedbackService | null = null;

export function getFeedbackService(): FeedbackService {
  if (!_feedbackService) {
    _feedbackService = new FeedbackService();
  }
  return _feedbackService;
}

export function resetFeedbackService(): void {
  _feedbackService = null;
}

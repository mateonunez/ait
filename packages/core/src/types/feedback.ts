export type FeedbackRating = "thumbs_up" | "thumbs_down" | "neutral";

export interface FeedbackStats {
  total: number;
  thumbsUp: number;
  thumbsDown: number;
  neutral: number;
  thumbsUpRate: number;
  qualityScore: number;
}

export interface QualityTrendPoint {
  timestamp: number;
  score: number;
  totalFeedback: number;
  thumbsUpCount: number;
  thumbsDownCount: number;
}

export interface ListFeedbackOptions {
  windowMs?: number;
  rating?: FeedbackRating;
  userId?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

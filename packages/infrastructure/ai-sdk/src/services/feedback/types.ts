/**
 * Feedback rating types
 */
export type FeedbackRating = "thumbs_up" | "thumbs_down" | "neutral";

/**
 * Feedback metadata
 */
export interface FeedbackMetadata {
  messageLength?: number;
  hadToolCalls?: boolean;
  latencyMs?: number;
  model?: string;
  [key: string]: unknown;
}

/**
 * Feedback record
 */
export interface Feedback {
  feedbackId: string;
  traceId: string;
  messageId: string;
  rating: FeedbackRating;
  comment?: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  metadata?: FeedbackMetadata;
}

/**
 * Feedback statistics
 */
export interface FeedbackStats {
  total: number;
  thumbsUp: number;
  thumbsDown: number;
  neutral: number;
  thumbsUpRate: number; // percentage 0-100
  qualityScore: number; // 0-100 based on feedback
}

/**
 * Quality trend data point
 */
export interface QualityTrendPoint {
  timestamp: number;
  score: number;
  totalFeedback: number;
  thumbsUpCount: number;
  thumbsDownCount: number;
}

/**
 * Problematic trace
 */
export interface ProblematicTrace {
  traceId: string;
  messageId: string;
  rating: FeedbackRating;
  comment?: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata?: FeedbackMetadata;
}

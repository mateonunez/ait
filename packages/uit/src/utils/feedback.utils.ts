/**
 * Feedback rating type
 */
export type FeedbackRating = "thumbs_up" | "thumbs_down";
import { apiPost } from "./http-client";

/**
 * Submit feedback for a message
 */
export async function submitFeedback(params: {
  messageId: string;
  traceId?: string;
  rating: FeedbackRating;
  comment?: string;
}): Promise<{ success: boolean; feedbackId?: string; error?: string }> {
  const res = await apiPost<{ feedbackId: string }>("http://localhost:3000/api/feedback", params);
  if (!res.ok) {
    console.error("[Feedback] Failed to submit feedback:", res.error);
    return { success: false, error: res.error };
  }
  return { success: true, feedbackId: res.data?.feedbackId };
}

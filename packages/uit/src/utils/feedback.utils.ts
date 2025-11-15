import { apiPost } from "./http-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://localhost:3000/api";

export type FeedbackRating = "thumbs_up" | "thumbs_down";

/**
 * Submit feedback for a message
 */
export async function submitFeedback(params: {
  messageId: string;
  traceId?: string;
  rating: FeedbackRating;
  comment?: string;
}): Promise<{ success: boolean; feedbackId?: string; error?: string }> {
  const res = await apiPost<{ feedbackId: string }>(`${API_BASE_URL}/feedback`, params);

  if (!res.ok) {
    console.error("[Feedback] Failed to submit feedback:", res.error);
    return { success: false, error: res.error };
  }

  return { success: true, feedbackId: res.data?.feedbackId };
}

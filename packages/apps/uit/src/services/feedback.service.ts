import { getLogger } from "@ait/core";
import { apiConfig } from "../config/api.config";
import { apiPost } from "../utils/http-client";

const logger = getLogger();

export type FeedbackRating = "thumbs_up" | "thumbs_down";

export async function submitFeedback(params: {
  messageId: string;
  traceId?: string;
  rating: FeedbackRating;
  comment?: string;
}): Promise<{ success: boolean; feedbackId?: string; error?: string }> {
  const res = await apiPost<{ feedbackId: string }>(`${apiConfig.apiBaseUrl}/feedback`, params);

  if (!res.ok) {
    logger.error("[FeedbackService] Failed to submit feedback:", { error: res.error });
    return { success: false, error: res.error };
  }

  return { success: true, feedbackId: res.data?.feedbackId };
}

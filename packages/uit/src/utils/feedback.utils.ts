/**
 * Feedback rating type
 */
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
  try {
    const response = await fetch("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[Feedback] Failed to submit feedback:", error);
      return {
        success: false,
        error: error.message || "Failed to submit feedback",
      };
    }

    const data = await response.json();
    console.log("[Feedback] Successfully submitted:", data);

    return {
      success: true,
      feedbackId: data.feedbackId,
    };
  } catch (error) {
    console.error("[Feedback] Error submitting feedback:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

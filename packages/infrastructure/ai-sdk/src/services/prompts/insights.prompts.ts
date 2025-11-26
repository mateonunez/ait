import type { ActivityData } from "../insights/insights.types";
import { getIntegrationRegistryService } from "../insights/integration-registry.service";

/**
 * Prompt templates for AI-powered insights generation
 */

export function getSummaryPrompt(activityData: ActivityData, range: "week" | "month" | "year"): string {
  const registry = getIntegrationRegistryService();
  const integrationKeys = Object.keys(activityData).filter((key) => {
    const data = activityData[key];
    return data && typeof data === "object" && "total" in data;
  });

  // Calculate total activity dynamically
  const totalActivity = integrationKeys.reduce((sum, key) => {
    const data = activityData[key];
    return sum + (data && typeof data === "object" && "total" in data ? data.total : 0);
  }, 0);

  const rangeText = range === "week" ? "this week" : range === "month" ? "this month" : "this year";

  // Build activity data list dynamically
  const activityList = integrationKeys
    .map((key) => {
      const data = activityData[key];
      if (!data || typeof data !== "object" || !("total" in data)) return "";
      const displayName = registry.getDisplayName(key as any);
      const unitLabel = registry.getUnitLabel(key as any);
      return `- ${displayName}: ${data.total} ${unitLabel}`;
    })
    .filter(Boolean)
    .join("\n");

  // Build daily breakdown for recent days
  const dailyBreakdown = integrationKeys
    .slice(0, 4) // Show up to 4 integrations in daily breakdown
    .map((key) => {
      const data = activityData[key];
      if (!data || typeof data !== "object" || !("daily" in data) || !Array.isArray(data.daily)) return "";
      const displayName = registry.getDisplayName(key as any);
      return `${displayName}: ${JSON.stringify(data.daily.slice(-7))}`;
    })
    .filter(Boolean)
    .join("\n");

  return `Analyze the user's activity across multiple integrations and generate an engaging, personalized summary.

ACTIVITY DATA FOR ${rangeText.toUpperCase()}:
${activityList}

TOTAL ACTIVITIES: ${totalActivity}

DAILY BREAKDOWN:
${dailyBreakdown}

INSTRUCTIONS:
1. Write in second person ("You listened to...", "You committed...")
2. Be encouraging, positive, and motivational
3. Highlight the most interesting patterns or achievements
4. Keep description under 100 words
5. Create a catchy title (max 50 chars)
6. Choose ONE relevant emoji that captures the vibe
7. Extract 2-3 key highlights as short phrases
8. Determine sentiment: positive (productive/active), neutral (steady), or negative (declining activity)

TONE: Friendly, enthusiastic, and supportive - like a coding buddy celebrating your progress.

IMPORTANT: Respond ONLY with valid JSON matching this exact schema:
{
  "type": "summary",
  "title": "string (max 50 chars)",
  "description": "string (max 100 words)",
  "sentiment": "positive" | "neutral" | "negative",
  "emoji": "string (single emoji)",
  "highlights": ["string", "string"] (2-3 items)
}`;
}

export function getCorrelationPrompt(activityData: ActivityData): string {
  const registry = getIntegrationRegistryService();
  const integrationKeys = Object.keys(activityData).filter((key) => {
    const data = activityData[key];
    return data && typeof data === "object" && "total" in data && "daily" in data;
  });

  // Build activity data list dynamically
  const activityList = integrationKeys
    .map((key) => {
      const data = activityData[key];
      if (!data || typeof data !== "object" || !("total" in data) || !("daily" in data)) return "";
      const displayName = registry.getDisplayName(key as any);
      const unitLabel = registry.getUnitLabel(key as any);
      return `- ${displayName}: ${data.total} ${unitLabel} (daily: ${JSON.stringify(data.daily)})`;
    })
    .filter(Boolean)
    .join("\n");

  return `Identify interesting correlations and patterns between different activities.

ACTIVITY DATA:
${activityList}

TASK: Find meaningful behavioral patterns such as:
- Music listening habits during coding sessions
- Communication patterns (Slack/X) vs coding productivity
- Time-of-day patterns across activities
- Activity clustering (high activity days vs quiet days)

For each correlation:
1. Identify which integrations are correlated
2. Describe the pattern in plain language
3. Provide a concrete example from the data
4. Estimate correlation strength (0-100)
5. Assign confidence level (0.0-1.0)

RETURN: Up to 3 strongest correlations as JSON array.

IMPORTANT: Respond ONLY with valid JSON array:
[
  {
    "type": "correlation",
    "integrations": ["integration1", "integration2"],
    "pattern": "clear, concise pattern description",
    "strength": 75,
    "description": "detailed explanation of why this correlation matters",
    "example": "specific example from the data",
    "confidence": 0.8
  }
]

Return empty array [] if no significant patterns found.`;
}

export function getAnomalyPrompt(
  currentData: ActivityData,
  historicalMean: Record<string, number>,
  historicalStdDev: Record<string, number>,
): string {
  const registry = getIntegrationRegistryService();
  const integrationKeys = Object.keys(currentData).filter((key) => {
    const data = currentData[key];
    return data && typeof data === "object" && "total" in data;
  });

  // Build current period list dynamically
  const currentPeriodList = integrationKeys
    .map((key) => {
      const data = currentData[key];
      if (!data || typeof data !== "object" || !("total" in data)) return "";
      const displayName = registry.getDisplayName(key as any);
      const unitLabel = registry.getUnitLabel(key as any);
      return `- ${displayName}: ${data.total} ${unitLabel}`;
    })
    .filter(Boolean)
    .join("\n");

  // Build historical baseline list dynamically
  const historicalList = integrationKeys
    .map((key) => {
      const displayName = registry.getDisplayName(key as any);
      const mean = historicalMean[key] || 0;
      const stdDev = historicalStdDev[key] || 0;
      return `- ${displayName}: ${mean} ± ${stdDev}`;
    })
    .filter(Boolean)
    .join("\n");

  return `Detect unusual patterns or deviations from normal behavior.

CURRENT PERIOD:
${currentPeriodList}

HISTORICAL BASELINE (mean ± std dev):
${historicalList}

TASK: Identify anomalies (deviations > 2 standard deviations):
1. Calculate z-score for each metric
2. Flag significant deviations as "spike" or "drop"
3. Classify severity:
   - low: 2-2.5 std deviations
   - medium: 2.5-3 std deviations
   - high: >3 std deviations
4. Provide context-aware description (e.g., "Your GitHub activity dropped 60% this week")

IMPORTANT: Respond ONLY with valid JSON array:
[
  {
    "type": "anomaly",
    "integration": "${integrationKeys.join('" | "')}",
    "metric": "total_activity",
    "deviation": 2.5,
    "description": "human-readable explanation",
    "severity": "low" | "medium" | "high",
    "direction": "spike" | "drop",
    "historical": {
      "mean": number,
      "stdDev": number,
      "current": number
    }
  }
]

Return empty array [] if no anomalies detected.`;
}

export function getRecommendationPrompt(
  activityData: ActivityData,
  anomalies: Array<any>,
  correlations: Array<any>,
): string {
  const registry = getIntegrationRegistryService();
  const integrationKeys = Object.keys(activityData).filter((key) => {
    const data = activityData[key];
    return data && typeof data === "object" && "total" in data;
  });

  const hasAnomalies = anomalies.length > 0;
  const hasCorrelations = correlations.length > 0;

  // Build activity summary dynamically
  const activitySummary = integrationKeys
    .map((key) => {
      const data = activityData[key];
      if (!data || typeof data !== "object" || !("total" in data)) return "";
      const displayName = registry.getDisplayName(key as any);
      const unitLabel = registry.getUnitLabel(key as any);
      return `- ${displayName}: ${data.total} ${unitLabel}`;
    })
    .filter(Boolean)
    .join("\n");

  return `Generate actionable recommendations based on activity patterns.

ACTIVITY SUMMARY:
${activitySummary}

DETECTED ANOMALIES: ${hasAnomalies ? JSON.stringify(anomalies) : "None"}
DETECTED CORRELATIONS: ${hasCorrelations ? JSON.stringify(correlations) : "None"}

TASK: Generate 2-3 personalized recommendations:

CATEGORIES:
- "productivity": Time management, focus strategies
- "wellness": Work-life balance, breaks
- "learning": Skill development, exploration
- "social": Communication, networking
- "optimization": Workflow improvements

For each recommendation:
1. Choose appropriate category
2. Write clear, actionable suggestion
3. Explain why it matters based on the data
4. Assign priority (1-5, where 5 is urgent)
5. Suggest an icon (emoji or name)

TONE: Supportive and practical, like a productivity coach.

IMPORTANT: Respond ONLY with valid JSON array:
[
  {
    "type": "recommendation",
    "category": "productivity" | "wellness" | "learning" | "social" | "optimization",
    "action": "Clear, actionable suggestion (one sentence)",
    "reason": "Why this matters based on data (one sentence)",
    "priority": 3,
    "icon": "📊"
  }
]

Return 2-3 recommendations, prioritized by impact.`;
}

/**
 * Helper function to create a complete insights generation prompt
 */
export function getCompleteInsightsPrompt(
  activityData: ActivityData,
  range: "week" | "month" | "year",
  options: {
    includeSummary?: boolean;
    includeCorrelations?: boolean;
    includeAnomalies?: boolean;
    includeRecommendations?: boolean;
  } = {},
): {
  summaryPrompt?: string;
  correlationPrompt?: string;
  anomalyPrompt?: string;
  recommendationPrompt?: string;
} {
  const prompts: any = {};

  if (options.includeSummary !== false) {
    prompts.summaryPrompt = getSummaryPrompt(activityData, range);
  }

  if (options.includeCorrelations !== false) {
    prompts.correlationPrompt = getCorrelationPrompt(activityData);
  }

  // Note: Anomaly and recommendation prompts require additional data
  // They will be generated in the service layer

  return prompts;
}

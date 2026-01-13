import type {
  ActivityData,
  InsightAnomaly,
  InsightCorrelation,
  IntegrationActivity,
  IntegrationVendor,
} from "@ait/core";
import { getIntegrationRegistryService } from "../insights/integration-registry.service";

function formatActivityContext(activityData: ActivityData): string {
  const registry = getIntegrationRegistryService();
  const validEntries = Object.entries(activityData)
    .filter((entry): entry is [string, IntegrationActivity] => entry[1] != null && "total" in entry[1])
    .map(([vendor, data]) => ({
      vendor: vendor as IntegrationVendor,
      displayName: registry.getVendorDisplayName(vendor as IntegrationVendor),
      total: data.total,
      unit: registry.getUnitLabel(vendor as IntegrationVendor),
      daily: data.daily,
    }));

  if (validEntries.length === 0) return "No activity recorded.";

  return validEntries.map((e) => `- ${e.displayName}: ${e.total} ${e.unit}`).join("\n");
}

function formatDailyBreakdownContext(activityData: ActivityData): string {
  const registry = getIntegrationRegistryService();
  return Object.entries(activityData)
    .filter((entry): entry is [string, IntegrationActivity] => entry[1] != null && Array.isArray(entry[1].daily))
    .map(([vendor, data]) => {
      const displayName = registry.getVendorDisplayName(vendor as IntegrationVendor);
      const recentDaily = data.daily.slice(-7);
      return `${displayName} (Last 7 days): ${JSON.stringify(recentDaily)}`;
    })
    .filter(Boolean)
    .join("\n");
}

const JSON_INSTRUCTIONS = `
OUTPUT CONSTRAINTS:
- Respond ONLY with a valid JSON object or array as specified.
- Do not include any preamble, markdown code blocks, or post-response commentary.
- Ensure all fields match the specified schema exactly.
`;

export function getSummaryPrompt(activityData: ActivityData, range: "week" | "month" | "year"): string {
  const totalActivity = Object.values(activityData).reduce((sum, data) => sum + (data?.total || 0), 0);
  const rangeText = range === "week" ? "this week" : range === "month" ? "this month" : "this year";

  return `
Role: Senior Personal Insights Assistant
Task: Generate a high-impact, motivational activity summary.

<ActivityData>
Range: ${rangeText.toUpperCase()}
Total Activities: ${totalActivity}
Summary by Service:
${formatActivityContext(activityData)}

Daily Trends:
${formatDailyBreakdownContext(activityData)}
</ActivityData>

<Instructions>
1. Audience: Second person ("You").
2. Tone: Enthusiastic, supportive, and data-driven.
3. Content: Highlight the biggest win or most consistent habit.
4. Sentiment Logic:
   - "positive": Activity is high or increasing.
   - "neutral": Steady activity.
   - "negative": Sharp decline in key metrics.
5. Constraints:
   - Keep description < 80 words.
   - Title < 40 characters.
   - Emoji must be highly relevant to the primary theme of the data.
</Instructions>

${JSON_INSTRUCTIONS}

Expected Schema:
{
  "type": "summary",
  "title": "A catchy, personalized headline",
  "description": "Engaging 2-3 sentence summary of progress",
  "sentiment": "positive" | "neutral" | "negative",
  "emoji": "Single character emoji",
  "highlights": ["Short phrase (3-4 words)", "Short phrase (3-4 words)"]
}
`;
}

export function getCorrelationPrompt(activityData: ActivityData): string {
  return `
Role: Behavioral Analyst
Task: Identify non-obvious correlations between different user activities.

<Context>
${formatActivityContext(activityData)}
Detailed Activity Stream:
${formatDailyBreakdownContext(activityData)}
</Context>

<AnalysisGoals>
Find patterns like:
- Deep focus (GitHub activity) vs communication (Slack/X).
- Flow state triggers (Spotify tracks played before/during coding).
- Work-life balance (Meetings vs Evening productivity).
</AnalysisGoals>

${JSON_INSTRUCTIONS}

Return up to 3 correlations in this format:
[
  {
    "type": "correlation",
    "integrations": ["list", "of", "services"],
    "pattern": "Concise observation",
    "strength": 0-100,
    "description": "Detailed hypothesis of the relationship",
    "example": "Data-backed evidence from the provided context",
    "confidence": 0.0-1.0
  }
]
`;
}

export function getAnomalyPrompt(
  currentData: ActivityData,
  historicalMean: Record<string, number>,
  historicalStdDev: Record<string, number>,
): string {
  const registry = getIntegrationRegistryService();
  const baselineContext = Object.entries(historicalMean)
    .map(([vendor, mean]) => {
      const displayName = registry.getVendorDisplayName(vendor as IntegrationVendor);
      return `- ${displayName}: Mean=${mean.toFixed(1)}, StdDev=${(historicalStdDev[vendor] || 0).toFixed(1)}`;
    })
    .join("\n");

  return `
Role: Statistical Anomaly Detector
Task: Identify significant deviations from the user's historical baseline.

<Baseline>
${baselineContext}
</Baseline>

<CurrentActivity>
${formatActivityContext(currentData)}
</CurrentActivity>

<DetectionRules>
1. Calculate Z-Score: (Current - Mean) / StdDev.
2. Severities:
   - "high": |Z| > 3.0
   - "medium": |Z| > 2.5
   - "low": |Z| > 2.0
3. Only report deviations where |Z| > 2.0.
</DetectionRules>

${JSON_INSTRUCTIONS}

Return anomalies as a JSON array:
[
  {
    "type": "anomaly",
    "integration": "Service Name",
    "metric": "total_activity",
    "deviation": Z-Score,
    "description": "Clear explanation of the spike or drop",
    "severity": "low" | "medium" | "high",
    "direction": "spike" | "drop",
    "historical": { "mean": number, "stdDev": number, "current": number }
  }
]
`;
}

export function getRecommendationPrompt(
  activityData: ActivityData,
  anomalies: InsightAnomaly[],
  correlations: InsightCorrelation[],
): string {
  return `
Role: Professional Performance Coach
Task: Generate high-leverage recommendations based on recent behavior.

<DataInput>
Activity Overview:
${formatActivityContext(activityData)}

Detected Anomalies:
${JSON.stringify(anomalies)}

Internal Patterns:
${JSON.stringify(correlations)}
</DataInput>

<RecommendationFramework>
- "productivity": Deep work, async communication, focused sessions.
- "wellness": Recovery, break-taking, digital detox.
- "learning": Skill acquisition, creative exploration.
- "optimization": Workflow automation, scheduling changes.
</RecommendationFramework>

${JSON_INSTRUCTIONS}

Return 2-3 recommendations prioritized by impact:
[
  {
    "type": "recommendation",
    "category": "productivity" | "wellness" | "learning" | "optimization",
    "action": "One actionable imperative sentence",
    "reason": "Data-backed justification for this specific advice",
    "priority": 1-5 (5 is highest),
    "icon": "Relevant emoji"
  }
]
`;
}

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
  return {
    ...(options.includeSummary !== false && { summaryPrompt: getSummaryPrompt(activityData, range) }),
    ...(options.includeCorrelations !== false && { correlationPrompt: getCorrelationPrompt(activityData) }),
  };
}

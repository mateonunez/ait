export const buildQueryPlanningPrompt = (
  userQuery: string,
  queriesCount: number,
  entityTypes?: string[],
  isTemporalQuery?: boolean,
  timeReference?: string,
) => {
  const basePrompt = [
    `Generate ~${queriesCount} search queries for a personal knowledge base (code, tweets, music, linear issues, notion docs).`,
    "Rules: 2-8 words, lowercase, natural language, no ids/urls/hashtags. Use first-person ('my').",
    "Avoid generic knowledge - focus on user's data (my tweets, recently played, prs merged, tasks).",
  ];

  if (entityTypes && entityTypes.length > 0) {
    basePrompt.push(`Entity types: ${entityTypes.join(", ")}`);
    if (isTemporalQuery) {
      const timeRef = timeReference || "timeframe";
      basePrompt.push(`Temporal query - include time context: ${timeRef}`);
    }
  }

  basePrompt.push(
    "",
    `User query: "${userQuery}"`,
    "",
    'Return JSON: {"queries": ["query 1", "query 2", ...], "tags": ["tag1", "tag2", ...]}',
    "Minimum 4 queries. Tags optional. Return ONLY the JSON object.",
  );

  return basePrompt.join("\n");
};

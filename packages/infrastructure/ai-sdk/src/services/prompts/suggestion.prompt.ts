export const buildSuggestionPrompt = (context?: string, history?: string): string => {
  return `You are an AI assistant helping a user with their daily tasks, coding, and productivity.
Your goal is to generate 3-4 short, relevant, and engaging questions or commands that the user might want to ask you next.

Context:
${context || "User is on the home dashboard."}

Recent Conversation History:
${history || "No recent history."}

Instructions:
1. Analyze the context and history to understand the user's current focus.
2. Generate 3-4 distinct suggestions.
3. Suggestions should be concise (under 10 words).
4. Suggestions should be actionable.
5. If no context/history is provided, generate generic but useful starting points (e.g., "Summarize my day", "Check my GitHub activity").
6. Return ONLY the suggestions as a JSON array of strings.

Example Output:
["Check my latest PRs", "Summarize my meetings", "What's on my todo list?"]
`.trim();
};

import type { ChatMessage } from "../../types/chat";

function formatMessages(messages: ChatMessage[]): string {
  if (!messages || messages.length === 0) return "";

  return messages
    .map(
      (msg) =>
        `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content.slice(0, 200)}${msg.content.length > 200 ? "..." : ""}`,
    )
    .join("\n");
}

export const buildSuggestionPrompt = (context?: string, history?: string, recentMessages?: ChatMessage[]): string => {
  const formattedMessages = recentMessages ? formatMessages(recentMessages) : history;

  return `You are AIt, a personal AI assistant connected to the user's productivity tools.

TASK: Generate 3-4 smart follow-up questions or actions the user might want to ask next.

CONNECTED INTEGRATIONS:
• GitHub: Search code, view PRs, check commits, browse repos
• Linear: View issues, check project status, search tasks
• Notion: Search pages, read documents, browse databases
• Slack: Search messages, view channels (read-only)
• Spotify: Current track, recent listening, playlists
• Google: Calendar events, YouTube subscriptions
• X/Twitter: View tweets, check activity

CURRENT CONTEXT:
${context || "User just opened the chat."}

RECENT CONVERSATION:
${formattedMessages || "Fresh conversation - no history yet."}

RULES:
1. Suggestions must be SPECIFIC to the conversation context
2. If user asked about code → suggest related code queries
3. If user asked about music → suggest music-related follow-ups
4. Keep each suggestion under 8 words
5. Make suggestions feel natural, like a helpful colleague
6. Avoid generic suggestions if there's conversation context

OUTPUT FORMAT:
Return ONLY a JSON array of 3-4 strings. No explanation.

EXAMPLES:
["What PR did I review last?", "Play something similar", "Check my calendar for tomorrow"]
["Show related files", "Who else worked on this?", "Any open issues here?"]
`.trim();
};

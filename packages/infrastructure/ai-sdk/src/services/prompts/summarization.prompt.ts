export const buildSummarizationPrompt = (
  messages: Array<{ role: string; content: string }>,
  currentSummary?: string,
): string => {
  const conversationText = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");

  return `
You are an expert conversation summarizer. Your goal is to create a concise yet comprehensive summary of the conversation history to maintain context for the AI assistant.

${currentSummary ? `CURRENT SUMMARY:\n${currentSummary}\n\n` : ""}
RECENT CONVERSATION:
${conversationText}

INSTRUCTIONS:
1. Update the current summary (if any) with new information from the recent conversation.
2. Retain key user preferences, specific entities mentioned (names, dates, project IDs), and the current goal.
3. Discard trivial chitchat or resolved clarifications.
4. If the topic has shifted completely, note the previous topic briefly and focus on the new one.
5. The summary should be a single paragraph, optimized for machine understanding.

OUTPUT FORMAT:
Return ONLY the updated summary text. Do not include "Here is the summary" or any other conversational filler.
`.trim();
};

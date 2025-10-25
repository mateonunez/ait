import type { PromptComponents } from "../../types/text-generation";
import type { ChatMessage } from "../../types/chat";

/**
 * Interface for prompt builder service
 */
export interface IPromptBuilderService {
  /**
   * Build a complete prompt from components
   * @param components - Prompt components
   * @returns Formatted prompt string
   */
  buildPrompt(components: PromptComponents): string;

  /**
   * Build messages array for tool-aware generation
   * @param systemMessage - System message
   * @param conversationHistory - Conversation history
   * @param userMessage - Current user message
   * @returns Messages array
   */
  buildMessages(
    systemMessage: string,
    conversationHistory: ChatMessage[] | undefined,
    userMessage: string,
  ): Array<{ role: string; content: string }>;
}

/**
 * Service for building prompts from components
 */
export class PromptBuilderService implements IPromptBuilderService {
  buildPrompt(components: PromptComponents): string {
    const parts: string[] = [components.systemMessage];

    // Add conversation history if present
    if (components.conversationHistory?.trim()) {
      parts.push(components.conversationHistory);
    }

    // Add tool results if present
    if (components.toolResults?.trim()) {
      parts.push(components.toolResults);
    }

    // Add current user message
    parts.push(`User: ${components.userMessage}`);

    // Add assistant prompt
    parts.push("Assistant:");

    return parts.join("\n\n");
  }

  buildMessages(
    systemMessage: string,
    conversationHistory: ChatMessage[] | undefined,
    userMessage: string,
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [{ role: "system", content: systemMessage }];

    // Add conversation history if present
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    return messages;
  }
}

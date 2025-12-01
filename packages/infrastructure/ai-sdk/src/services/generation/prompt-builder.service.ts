import type { ChatMessage } from "../../types/chat";
import type { ModelMessage } from "../../types/models";
import type { PromptComponents } from "../../types/text-generation";

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
  ): ModelMessage[];
}

/**
 * Service for building prompts from components
 */
export class PromptBuilderService implements IPromptBuilderService {
  buildPrompt(components: PromptComponents): string {
    const { systemMessage, conversationHistory, userMessage, toolResults, intent } = components;

    // Select style-based system instruction
    let styleInstruction = "";
    if (intent?.requiredStyle) {
      switch (intent.requiredStyle) {
        case "concise":
          styleInstruction = "Answer concisely. Avoid fluff. Be direct.";
          break;
        case "technical":
          styleInstruction =
            "Provide technical details, code snippets, and architectural context. Assume the user is an engineer.";
          break;
        case "creative":
          styleInstruction = "Be creative and engaging. Use metaphors where appropriate.";
          break;
        default:
          styleInstruction = "Provide detailed, comprehensive explanations.";
          break;
      }
    }

    // Build structured XML prompt
    const parts: string[] = [];

    // 1. System Section
    const systemParts = ["<system>", systemMessage];
    if (styleInstruction) {
      systemParts.push(styleInstruction);
    }
    systemParts.push("</system>");
    parts.push(systemParts.join("\n"));

    // 2. Context/History Section
    if (conversationHistory?.trim()) {
      parts.push(`<history>\n${conversationHistory}\n</history>`);
    }

    // 3. Tool Results Section
    if (toolResults?.trim()) {
      parts.push(`<tool_results>\n${toolResults}\n</tool_results>`);
    }

    // 4. User Input Section
    parts.push(`<user>\n${userMessage}\n</user>`);

    // 5. Assistant Trigger
    parts.push("Assistant:");

    return parts.join("\n\n");
  }

  buildMessages(
    systemMessage: string,
    conversationHistory: ChatMessage[] | undefined,
    userMessage: string,
  ): ModelMessage[] {
    const messages: ModelMessage[] = [{ role: "system", content: systemMessage }];

    // Add conversation history if present
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role as "user" | "assistant" | "system" | "tool",
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

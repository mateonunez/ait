import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { IPromptBuilder, PromptOperation, PromptConfig } from "./prompt.types";

export class PromptBuilder implements IPromptBuilder {
  private config: PromptConfig;
  private fewShotExamples: Array<{ input: string; output: string }> = [];

  constructor(config: PromptConfig) {
    this.config = config;
  }

  public async build(operation: PromptOperation, context: string, userPrompt: string): Promise<ChatPromptTemplate> {
    const enhancedUserPrompt = `${userPrompt}\n\nInstructions: Use ONLY the provided CONTEXT. Do NOT invent names, dates, metrics, or entities.`;
    
    const systemPrompt = this.config.systemPrompt
      .replace("{context}", context)
      .replace("{prompt}", enhancedUserPrompt);

    const messages: [string, string][] = [["system", systemPrompt]];

    if (this.fewShotExamples.length > 0) {
      for (const example of this.fewShotExamples) {
        messages.push(["user", example.input]);
        messages.push(["assistant", example.output]);
      }
    }

    messages.push(["user", "Please respond based on the instructions and context provided in the system message."]);

    return ChatPromptTemplate.fromMessages(messages);
  }

  public addFewShotExample(input: string, output: string): void {
    this.fewShotExamples.push({ input, output });
  }


}

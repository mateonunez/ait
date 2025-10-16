import type { ChatPromptTemplate } from "@langchain/core/prompts";

export type PromptOperation = "text-generation" | "streaming" | "analytics";

export interface PromptConfig {
  systemPrompt: string;
  operation: PromptOperation;
  fewShotExamples?: Array<{
    input: string;
    output: string;
  }>;
}

export interface IPromptBuilder {
  build(operation: PromptOperation, context: string, userPrompt: string): Promise<ChatPromptTemplate>;
  addFewShotExample(input: string, output: string): void;
}

import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { IPromptBuilder, PromptOperation, PromptConfig } from "./prompt.types";

export class PromptBuilder implements IPromptBuilder {
  private config: PromptConfig;
  private fewShotExamples: Array<{ input: string; output: string }> = [];
  private chainOfThought = false;

  constructor(config: PromptConfig) {
    this.config = config;
  }

  public async build(operation: PromptOperation, context: string, userPrompt: string): Promise<ChatPromptTemplate> {
    const systemPrompt = this.buildSystemPrompt(operation, context);
    const messages: [string, string][] = [["system", systemPrompt]];

    if (this.fewShotExamples.length > 0) {
      for (const example of this.fewShotExamples) {
        messages.push(["user", example.input]);
        messages.push(["assistant", example.output]);
      }
    }

    const formattedUserPrompt = this.chainOfThought
      ? `${userPrompt}\n\nPlease think through this step-by-step and explain your reasoning.`
      : userPrompt;

    messages.push(["user", formattedUserPrompt]);

    return ChatPromptTemplate.fromMessages(messages);
  }

  public addFewShotExample(input: string, output: string): void {
    this.fewShotExamples.push({ input, output });
  }

  public setChainOfThought(enabled: boolean): void {
    this.chainOfThought = enabled;
  }

  private buildSystemPrompt(operation: PromptOperation, context: string): string {
    const basePrompt = this.config.systemPrompt || this.getDefaultSystemPrompt(operation);

    const operationSpecificInstructions = this.getOperationSpecificInstructions(operation);
    const chainOfThoughtInstructions = this.chainOfThought ? this.getChainOfThoughtInstructions() : "";

    return `
${basePrompt}

${operationSpecificInstructions}

${chainOfThoughtInstructions}

CONTEXT:
${context}

RESPONSE GUIDELINES:
1. Always validate data against known schemas
2. Preserve relationships between entities
3. Maintain data type consistency
4. Include relevant metrics when available
5. Format responses to match source data structure
6. Cite specific entity IDs when referencing data
7. Handle missing or null values gracefully
`.trim();
  }

  private getDefaultSystemPrompt(operation: PromptOperation): string {
    return `You are an intelligent assistant specialized in ${operation} with expertise in structured data analysis and chain-of-thought reasoning.

Your core capabilities include:
- Advanced data validation and interpretation
- Complex relationship analysis between entities
- Step-by-step reasoning for complex tasks
- Precise and consistent output formatting`;
  }

  private getOperationSpecificInstructions(operation: PromptOperation): string {
    const instructions: Record<PromptOperation, string> = {
      "text-generation": `
GENERATION GUIDELINES:
- Provide comprehensive yet concise responses
- Maintain consistent formatting throughout the response
- Use markdown for structured output when appropriate
- Include relevant citations and references`,

      streaming: `
STREAMING GUIDELINES:
- Generate coherent chunks of information
- Maintain context consistency across chunks
- Signal completion appropriately
- Handle interruptions gracefully`,

      analytics: `
ANALYTICS GUIDELINES:
- Focus on quantitative analysis
- Include statistical significance when relevant
- Highlight trends and patterns
- Provide actionable insights`,
    };

    return instructions[operation] || "";
  }

  private getChainOfThoughtInstructions(): string {
    return `
REASONING PROCESS:
1. Break down the problem into smaller components
2. Analyze each component systematically
3. Show your work and explain your thinking
4. Consider alternative approaches
5. Validate your conclusions with available data`;
  }
}

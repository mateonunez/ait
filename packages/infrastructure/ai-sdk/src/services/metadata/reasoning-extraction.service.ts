import { createReasoningStep, REASONING_TYPE, type ReasoningStep, type ReasoningType } from "../../types";

/**
 * Service for extracting chain-of-thought reasoning from model responses
 */

export interface IReasoningExtractionService {
  extractReasoning(text: string): ReasoningStep[];
  detectReasoningPatterns(text: string): boolean;
}

export class ReasoningExtractionService implements IReasoningExtractionService {
  private readonly reasoningPatterns = [
    /(?:Let me think|Let's think|I'm thinking|My reasoning)/i,
    /(?:First|Second|Third|Finally|Then|Next|After that)/i,
    /(?:Therefore|Thus|Hence|Consequently|As a result)/i,
    /(?:Because|Since|Given that|Considering that)/i,
    /(?:Step \d+|Phase \d+)/i,
  ];

  private readonly reasoningMarkers: Map<RegExp, ReasoningType> = new Map([
    [/(?:analyz|evaluat|examin|consider)/i, REASONING_TYPE.ANALYSIS],
    [/(?:plan|strateg|approach|design)/i, REASONING_TYPE.PLANNING],
    [/(?:implement|execut|perform|do)/i, REASONING_TYPE.EXECUTION],
    [/(?:reflect|review|assess|conclude)/i, REASONING_TYPE.REFLECTION],
  ]);

  /**
   * Detect if text contains reasoning patterns
   */
  detectReasoningPatterns(text: string): boolean {
    return this.reasoningPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Extract reasoning steps from text
   */
  extractReasoning(text: string): ReasoningStep[] {
    const steps: ReasoningStep[] = [];

    // Split by common step indicators
    const sections = this.splitIntoSections(text);

    sections.forEach((section, index) => {
      const trimmed = section.trim();
      if (trimmed.length < 10) return; // Skip very short sections

      const reasoningType = this.detectReasoningType(trimmed);
      const step = createReasoningStep(trimmed, reasoningType, index);

      // Add confidence based on pattern matching
      step.confidence = this.calculateConfidence(trimmed);

      steps.push(step);
    });

    return steps;
  }

  /**
   * Split text into reasoning sections
   */
  private splitIntoSections(text: string): string[] {
    // Split by common step markers
    const stepMarkers = [
      /\n(?:Step \d+:|Phase \d+:|\d+\.|First,|Second,|Third,|Finally,|Then,|Next,)/gi,
      /\n(?:Let me|Let's|I will|I'll)/gi,
    ];

    let sections: string[] = [text];

    for (const marker of stepMarkers) {
      const newSections: string[] = [];
      for (const section of sections) {
        const parts = section.split(marker);
        newSections.push(...parts.filter((p) => p.trim().length > 0));
      }
      sections = newSections;
    }

    // If no clear sections, try splitting by paragraphs
    if (sections.length === 1 && text.includes("\n\n")) {
      sections = text.split("\n\n").filter((s) => s.trim().length > 0);
    }

    return sections.length > 1 ? sections : [text];
  }

  /**
   * Detect the type of reasoning step
   */
  private detectReasoningType(text: string): ReasoningType {
    for (const [pattern, type] of this.reasoningMarkers) {
      if (pattern.test(text)) {
        return type;
      }
    }
    return REASONING_TYPE.ANALYSIS;
  }

  /**
   * Calculate confidence score for reasoning step
   */
  private calculateConfidence(text: string): number {
    let score = 0.5; // Base confidence

    // Increase confidence for clear reasoning indicators
    if (/(?:because|since|therefore|thus)/i.test(text)) {
      score += 0.2;
    }

    // Increase confidence for structured thinking
    if (/(?:step|phase|first|second)/i.test(text)) {
      score += 0.1;
    }

    // Increase confidence for longer, well-formed thoughts
    if (text.length > 100 && text.includes(".")) {
      score += 0.1;
    }

    // Decrease confidence for very short text
    if (text.length < 30) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }
}

// Singleton instance
let reasoningExtractionService: IReasoningExtractionService | null = null;

export function getReasoningExtractionService(): IReasoningExtractionService {
  if (!reasoningExtractionService) {
    reasoningExtractionService = new ReasoningExtractionService();
  }
  return reasoningExtractionService;
}

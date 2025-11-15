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
    // English patterns
    /(?:Let me think|Let's think|I'm thinking|My reasoning)/i,
    /(?:First|Second|Third|Finally|Then|Next|After that)/i,
    /(?:Therefore|Thus|Hence|Consequently|As a result)/i,
    /(?:Because|Since|Given that|Considering that)/i,
    /(?:Step \d+|Phase \d+)/i,
    // Italian patterns
    /(?:Pensiamo|Analizziamo|Consideriamo|Ragioniamo)/i,
    /(?:Prima|Secondo|Terzo|Quarto|Infine|Poi|Dopo|Successivamente)/i,
    /(?:Quindi|Dunque|Pertanto|Di conseguenza|Come risultato)/i,
    /(?:Perché|Dato che|Considerando che|Poiché|Visto che)/i,
    /(?:Passo \d+|Fase \d+)/i,
    // Spanish patterns
    /(?:Pensemos|Analicemos|Consideremos|Razonemos)/i,
    /(?:Primero|Segundo|Tercero|Cuarto|Quinto|Finalmente|Luego|Después|A continuación)/i,
    /(?:Por lo tanto|Por tanto|Por consiguiente|En consecuencia|Como resultado)/i,
    /(?:Porque|Dado que|Considerando que|Ya que|Puesto que)/i,
    /(?:Paso \d+|Fase \d+)/i,
    // Generic structural patterns (language-agnostic)
    /^\d+[\.\)]\s+/m, // Numbered lists (1., 2., 3.)
    /^[-•*]\s+/m, // Bullet points
    /^[a-z][\.\)]\s+/im, // Lettered lists (a., b., c.)
  ];

  private readonly reasoningMarkers: Map<RegExp, ReasoningType> = new Map([
    // English markers
    [/(?:analyz|evaluat|examin|consider)/i, REASONING_TYPE.ANALYSIS],
    [/(?:plan|strateg|approach|design)/i, REASONING_TYPE.PLANNING],
    [/(?:implement|execut|perform|do)/i, REASONING_TYPE.EXECUTION],
    [/(?:reflect|review|assess|conclude)/i, REASONING_TYPE.REFLECTION],
    // Italian markers
    [/(?:analizz|valut|esamin|consider)/i, REASONING_TYPE.ANALYSIS],
    [/(?:pianific|strateg|approccio|progett)/i, REASONING_TYPE.PLANNING],
    [/(?:implement|esegu|realizz|fare|faccio)/i, REASONING_TYPE.EXECUTION],
    [/(?:riflett|rived|valut|conclud)/i, REASONING_TYPE.REFLECTION],
    // Spanish markers
    [/(?:analiz|evalú|examin|consider)/i, REASONING_TYPE.ANALYSIS],
    [/(?:planific|estrateg|enfoque|diseñ)/i, REASONING_TYPE.PLANNING],
    [/(?:implement|ejecut|realiz|hacer|hago)/i, REASONING_TYPE.EXECUTION],
    [/(?:reflexion|revis|evalú|conclu)/i, REASONING_TYPE.REFLECTION],
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
    // Split by common step markers (multi-language)
    const stepMarkers = [
      // English markers
      /\n(?:Step \d+:|Phase \d+:|\d+\.|First,|Second,|Third,|Finally,|Then,|Next,)/gi,
      /\n(?:Let me|Let's|I will|I'll)/gi,
      // Italian markers
      /\n(?:Passo \d+:|Fase \d+:|\d+\.|Prima,|Secondo,|Terzo,|Infine,|Poi,|Dopo,)/gi,
      /\n(?:Pensiamo|Analizziamo|Consideriamo|Ragioniamo)/gi,
      // Spanish markers
      /\n(?:Paso \d+:|Fase \d+:|\d+\.|Primero,|Segundo,|Tercero,|Finalmente,|Luego,|Después,|A continuación,)/gi,
      /\n(?:Pensemos|Analicemos|Consideremos|Razonemos)/gi,
      // Generic structural patterns
      /\n\d+[\.\)]\s+/g, // Numbered lists at start of line
      /\n[-•*]\s+/g, // Bullet points
      /\n[a-z][\.\)]\s+/gi, // Lettered lists
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

    // If still no sections, try splitting by single newlines with reasoning indicators
    if (sections.length === 1) {
      const lines = text.split("\n");
      if (lines.length > 2) {
        // Look for lines that start with reasoning indicators
        const reasoningLines: number[] = [];
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (
            trimmed.length > 0 &&
            (this.reasoningPatterns.some((p) => p.test(trimmed)) ||
              /^\d+[\.\)]/.test(trimmed) ||
              /^[-•*]/.test(trimmed))
          ) {
            reasoningLines.push(index);
          }
        });

        // If we found multiple reasoning lines, split at those points
        if (reasoningLines.length > 1) {
          sections = [];
          for (let i = 0; i < reasoningLines.length; i++) {
            const start = reasoningLines[i];
            const end = i < reasoningLines.length - 1 ? reasoningLines[i + 1] : lines.length;
            const section = lines.slice(start, end).join("\n").trim();
            if (section.length > 0) {
              sections.push(section);
            }
          }
        }
      }
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

    // Increase confidence for clear reasoning indicators (English)
    if (/(?:because|since|therefore|thus)/i.test(text)) {
      score += 0.2;
    }

    // Increase confidence for clear reasoning indicators (Italian)
    if (/(?:perché|dato che|quindi|dunque|pertanto)/i.test(text)) {
      score += 0.2;
    }

    // Increase confidence for clear reasoning indicators (Spanish)
    if (/(?:porque|dado que|por lo tanto|por tanto|por consiguiente)/i.test(text)) {
      score += 0.2;
    }

    // Increase confidence for structured thinking (English)
    if (/(?:step|phase|first|second)/i.test(text)) {
      score += 0.1;
    }

    // Increase confidence for structured thinking (Italian)
    if (/(?:passo|fase|prima|secondo|terzo)/i.test(text)) {
      score += 0.1;
    }

    // Increase confidence for structured thinking (Spanish)
    if (/(?:paso|fase|primero|segundo|tercero)/i.test(text)) {
      score += 0.1;
    }

    // Increase confidence for numbered/bulleted lists (language-agnostic)
    if (/^\d+[\.\)]/.test(text.trim()) || /^[-•*]/.test(text.trim())) {
      score += 0.15;
    }

    // Increase confidence for longer, well-formed thoughts
    if (text.length > 100 && text.includes(".")) {
      score += 0.1;
    }

    // Increase confidence if text contains multiple sentences (indicates reasoning)
    const sentenceCount = (text.match(/[.!?]+/g) || []).length;
    if (sentenceCount > 1) {
      score += 0.05;
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

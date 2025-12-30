export interface ReplacementPattern {
  pattern: RegExp;
  replacement: string;
}

export const INPUT_REPLACEMENTS: ReplacementPattern[] = [
  {
    pattern: /\bait\b/gi,
    replacement: "AIt",
  },
];

export function applyInputReplacements(text: string): string {
  let processedText = text;

  for (const { pattern, replacement } of INPUT_REPLACEMENTS) {
    processedText = processedText.replace(pattern, replacement);
  }

  return processedText;
}

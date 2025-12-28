export type ToolLoopConfig = {
  /** Number of tool rounds the caller wants to allow */
  maxToolRounds: number;
  /** Whether tools are enabled for this request */
  hasTools: boolean;
};

export function computeMaxSteps(config: ToolLoopConfig): number {
  if (!config.hasTools) return 1;
  // Allow an extra final assistant step after the last tool result.
  return Math.max(1, config.maxToolRounds + 1);
}

export type FinishSnapshot = {
  textLength: number;
  totalToolResults: number;
};

export function shouldAppendFallback(snapshot: FinishSnapshot, streamedTextLength: number): boolean {
  // If tools were used but the model produced no text, return a short completion message.
  return streamedTextLength === 0 && snapshot.totalToolResults > 0 && snapshot.textLength === 0;
}

export function defaultToolLoopFallbackMessage(): string {
  return "Done. The requested tool actions were executed.";
}

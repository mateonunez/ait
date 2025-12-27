import type { ClassifiedError } from "../services/errors/error-classification.service";

export interface AnalyticsRequestData {
  latencyMs: number;
  success: boolean;
  tokens?: number;
  generationTokens?: number;
  embeddingTokens?: number;
  error?: ClassifiedError;
  model?: string;
  promptLength?: number;
  responseLength?: number;
}

export interface IAnalyticsProvider {
  trackRequest(data: AnalyticsRequestData): void;
}

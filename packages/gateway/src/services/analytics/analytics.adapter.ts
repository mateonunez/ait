import {
  type AnalyticsRequestData,
  type ClassifiedError,
  type IAnalyticsProvider,
  registerAnalyticsProvider,
} from "@ait/ai-sdk";
import { type AnalyticsService, getAnalyticsService } from "./analytics.service";

/**
 * Adapter that matches the IAnalyticsProvider interface from @ait/ai-sdk
 * ensuring that the SDK can track analytics without a strict dependency on the service itself.
 */
export class AnalyticsAdapter implements IAnalyticsProvider {
  constructor(private readonly analyticsService: AnalyticsService) {}

  trackRequest(data: AnalyticsRequestData): void {
    const errorWithFingerprint = data.error
      ? ({
          ...data.error,
          category: data.error.category,
          severity: data.error.severity,
        } as ClassifiedError)
      : undefined;

    this.analyticsService.trackRequest({
      latencyMs: data.latencyMs,
      success: data.success,
      generationTokens: data.generationTokens ?? data.tokens,
      embeddingTokens: data.embeddingTokens,
      error: errorWithFingerprint,
      model: data.model,
    });
  }
}

export function initializeAnalyticsProvider(): void {
  const analyticsService = getAnalyticsService();
  registerAnalyticsProvider(new AnalyticsAdapter(analyticsService));
}

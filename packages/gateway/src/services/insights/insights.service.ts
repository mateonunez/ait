import crypto from "node:crypto";
import { getAItClient } from "@ait/ai-sdk";
import {
  DEFAULT_INSIGHTS_CONFIG,
  InsightCorrelationSchema,
  InsightRecommendationSchema,
  InsightSummarySchema,
  getLogger,
} from "@ait/core";
import type {
  ActivityData,
  InsightAnomaly,
  InsightCorrelation,
  InsightRecommendation,
  InsightSummary,
  InsightsConfig,
  InsightsData,
} from "@ait/core";
import { getCacheService } from "../cache/cache.service";
import { type AnomalyDetectorService, getAnomalyDetectorService } from "./anomaly-detector.service";
import { type CorrelationEngineService, getCorrelationEngineService } from "./correlation-engine.service";
import { getCorrelationPrompt, getRecommendationPrompt, getSummaryPrompt } from "./insights.prompts";

const logger = getLogger();

export class InsightsService {
  private config: Required<InsightsConfig>;
  private anomalyDetector: AnomalyDetectorService;
  private correlationEngine: CorrelationEngineService;
  private inFlight = new Map<string, Promise<InsightsData>>();

  constructor(
    config: InsightsConfig = {},
    anomalyDetector?: AnomalyDetectorService,
    correlationEngine?: CorrelationEngineService,
  ) {
    this.config = { ...DEFAULT_INSIGHTS_CONFIG, ...config };
    this.anomalyDetector = anomalyDetector || getAnomalyDetectorService({ threshold: this.config.anomalyThreshold });
    this.correlationEngine =
      correlationEngine || getCorrelationEngineService({ minStrength: this.config.correlationMinStrength });
  }

  async generateInsights(
    activityData: ActivityData,
    range: "week" | "month" | "year",
    historicalData: ActivityData[] = [],
    userId = "default",
  ): Promise<InsightsData> {
    const startTime = Date.now();
    const cacheKey = this._getCacheKey(activityData, range, userId);

    if (this.config.cacheEnabled) {
      const cached = await this._getCached(cacheKey);
      if (cached) {
        logger.debug("[InsightsService] Cache hit", { cacheKey, range, userId });
        return { ...cached, meta: { ...cached.meta, cacheHit: true } };
      }

      const existing = this.inFlight.get(cacheKey);
      if (existing) {
        logger.debug("[InsightsService] Reusing in-flight request", { cacheKey });
        return existing;
      }
    }

    const promise = (async () => {
      try {
        const [summary, correlations, anomalies] = await Promise.all([
          this._withRetry(() => this._generateSummary(activityData, range)),
          this._withRetry(() => this._findCorrelations(activityData)),
          this._withRetry(() => this._detectAnomalies(activityData, historicalData)),
        ]);

        const recommendations = await this._withRetry(() =>
          this._generateRecommendations(activityData, anomalies, correlations),
        );

        const insights: InsightsData = {
          timestamp: new Date().toISOString(),
          range,
          summary,
          correlations: correlations.slice(0, this.config.maxCorrelations),
          anomalies: anomalies.slice(0, this.config.maxAnomalies),
          recommendations: recommendations.slice(0, this.config.maxRecommendations),
          meta: {
            generationTimeMs: Date.now() - startTime,
            dataPoints: this._calculateDataPoints(activityData),
            cacheHit: false,
          },
        };

        if (this.config.cacheEnabled) await this._setCache(cacheKey, insights);
        return insights;
      } finally {
        this.inFlight.delete(cacheKey);
      }
    })();

    if (this.config.cacheEnabled) this.inFlight.set(cacheKey, promise);
    return promise;
  }

  /**
   * Helper for retrying AI calls with exponential backoff
   */
  private async _withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < retries) {
          const delay = 1000 * 2 ** i;
          logger.warn(`[InsightsService] AI call failed, retrying in ${delay}ms`, { attempt: i + 1, error });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  private async _generateSummary(data: ActivityData, range: any): Promise<InsightSummary | null> {
    if (!this.config.enableSummary) return null;
    const prompt = getSummaryPrompt(data, range);
    return await getAItClient().generateStructured<InsightSummary>({
      prompt,
      schema: InsightSummarySchema as any,
      temperature: 0.7,
    });
  }

  private async _findCorrelations(data: ActivityData): Promise<InsightCorrelation[]> {
    if (!this.config.enableCorrelations) return [];
    const statistical = await this.correlationEngine.findCorrelations(data);
    if (statistical.length === 0) return [];

    const prompt = getCorrelationPrompt(data);
    const ai = await getAItClient().generateStructured<InsightCorrelation[]>({
      prompt,
      schema: InsightCorrelationSchema.array() as any,
      temperature: 0.6,
    });

    return statistical.map((stat) => {
      const match = ai.find((a) => a.integrations.every((i) => stat.integrations.includes(i)));
      return match ? { ...stat, description: match.description, pattern: match.pattern } : stat;
    });
  }

  private async _detectAnomalies(data: ActivityData, historical: ActivityData[]): Promise<InsightAnomaly[]> {
    if (!this.config.enableAnomalies || historical.length === 0) return [];
    return await this.anomalyDetector.detectAnomalies(data, historical);
  }

  private async _generateRecommendations(
    data: ActivityData,
    anomalies: InsightAnomaly[],
    correlations: InsightCorrelation[],
  ): Promise<InsightRecommendation[]> {
    if (!this.config.enableRecommendations) return [];
    const prompt = getRecommendationPrompt(data, anomalies, correlations);
    return await getAItClient().generateStructured<InsightRecommendation[]>({
      prompt,
      schema: InsightRecommendationSchema.array() as any,
      temperature: 0.8,
    });
  }

  private _getCacheKey(data: ActivityData, range: string, userId: string): string {
    // Stable sort of keys to ensure consistent hashing
    const sortedVendors = Object.keys(data).sort();
    // Use totals as proxy for data freshness instead of hashing entire data
    const activityMap = data as any;
    const summary = sortedVendors.map((v) => `${v}:${activityMap[v]?.total || 0}`).join(",");

    const hash = crypto.createHash("md5").update(summary).digest("hex").slice(0, 8);

    return `insights:${userId}:${range}:${hash}`;
  }

  private async _getCached(key: string): Promise<InsightsData | null> {
    const res = getCacheService().get<InsightsData>(key);
    return res instanceof Promise ? await res : res;
  }

  private async _setCache(key: string, data: InsightsData): Promise<void> {
    const res = getCacheService().set(key, data, this.config.cacheTtlSeconds * 1000);
    if (res instanceof Promise) await res;
  }

  private _calculateDataPoints(data: ActivityData): number {
    return Object.values(data).reduce((sum, d) => sum + (d?.total || 0), 0);
  }
}

let instance: InsightsService | null = null;

export function getInsightsService(config?: InsightsConfig): InsightsService {
  if (!instance || config) instance = new InsightsService(config);
  return instance;
}

export function resetInsightsService(): void {
  instance = null;
}

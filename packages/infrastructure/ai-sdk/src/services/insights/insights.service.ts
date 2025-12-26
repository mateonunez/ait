import crypto from "node:crypto";
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
import { getAItClient } from "../../client/ai-sdk.client";
import { getCacheService } from "../cache/cache.service";
import { getCorrelationPrompt, getRecommendationPrompt, getSummaryPrompt } from "../prompts/insights.prompts";
import { type AnomalyDetectorService, getAnomalyDetectorService } from "./anomaly-detector.service";
import { type CorrelationEngineService, getCorrelationEngineService } from "./correlation-engine.service";

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
  ): Promise<InsightsData> {
    const startTime = Date.now();
    const cacheKey = this._getCacheKey(activityData, range);

    if (this.config.cacheEnabled) {
      const cached = await this._getCached(cacheKey);
      if (cached) return { ...cached, meta: { ...cached.meta, cacheHit: true } };

      const existing = this.inFlight.get(cacheKey);
      if (existing) return existing;
    }

    const promise = (async () => {
      try {
        const [summary, correlations, anomalies] = await Promise.all([
          this._generateSummary(activityData, range),
          this._findCorrelations(activityData),
          this._detectAnomalies(activityData, historicalData),
        ]);

        const recommendations = await this._generateRecommendations(activityData, anomalies, correlations);

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

  private async _generateSummary(data: ActivityData, range: any): Promise<InsightSummary | null> {
    if (!this.config.enableSummary) return null;
    try {
      const prompt = getSummaryPrompt(data, range);
      return await getAItClient().generateStructured<InsightSummary>({
        prompt,
        schema: InsightSummarySchema as any,
        temperature: 0.7,
      });
    } catch (error) {
      logger.error("Summary generation failed", { error });
      return null;
    }
  }

  private async _findCorrelations(data: ActivityData): Promise<InsightCorrelation[]> {
    if (!this.config.enableCorrelations) return [];
    try {
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
    } catch (error) {
      logger.error("Correlation analysis failed", { error });
      return [];
    }
  }

  private async _detectAnomalies(data: ActivityData, historical: ActivityData[]): Promise<InsightAnomaly[]> {
    if (!this.config.enableAnomalies || historical.length === 0) return [];
    try {
      return await this.anomalyDetector.detectAnomalies(data, historical);
    } catch (error) {
      logger.error("Anomaly detection failed", { error });
      return [];
    }
  }

  private async _generateRecommendations(
    data: ActivityData,
    anomalies: InsightAnomaly[],
    correlations: InsightCorrelation[],
  ): Promise<InsightRecommendation[]> {
    if (!this.config.enableRecommendations) return [];
    try {
      const prompt = getRecommendationPrompt(data, anomalies, correlations);
      return await getAItClient().generateStructured<InsightRecommendation[]>({
        prompt,
        schema: InsightRecommendationSchema.array() as any,
        temperature: 0.8,
      });
    } catch (error) {
      logger.error("Recommendation generation failed", { error });
      return [];
    }
  }

  private _getCacheKey(data: ActivityData, range: string): string {
    const ts = new Date().getHours();
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(Object.keys(data).sort()))
      .digest("hex")
      .slice(0, 8);
    return `insights:${range}:${ts}:${hash}`;
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

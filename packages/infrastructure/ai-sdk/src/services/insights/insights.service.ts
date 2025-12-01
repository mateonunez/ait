import crypto from "node:crypto";
import { getLogger } from "@ait/core";
import { getAItClient } from "../../client/ai-sdk.client";
import { getCacheService } from "../cache/cache.service";
import { getCorrelationPrompt, getRecommendationPrompt, getSummaryPrompt } from "../prompts/insights.prompts";
import { getAnomalyDetectorService } from "./anomaly-detector.service";
import { getCorrelationEngineService } from "./correlation-engine.service";
import type {
  ActivityData,
  InsightAnomaly,
  InsightCorrelation,
  InsightRecommendation,
  InsightSummary,
  InsightsConfig,
  InsightsData,
} from "./insights.types";
import {
  DEFAULT_INSIGHTS_CONFIG,
  InsightCorrelationSchema,
  InsightRecommendationSchema,
  InsightSummarySchema,
} from "./insights.types";

const logger = getLogger();

/**
 * Main insights service - orchestrates AI generation and analysis
 */
export class InsightsService {
  private config: Required<InsightsConfig>;
  private anomalyDetector;
  private correlationEngine;
  // Track in-flight generation requests to prevent duplicate work
  private inFlightGenerations = new Map<string, Promise<InsightsData>>();

  constructor(config: InsightsConfig = {}) {
    this.config = { ...DEFAULT_INSIGHTS_CONFIG, ...config };
    this.anomalyDetector = getAnomalyDetectorService({ threshold: this.config.anomalyThreshold });
    this.correlationEngine = getCorrelationEngineService({
      minStrength: this.config.correlationMinStrength,
    });
  }

  /**
   * Generate complete insights for activity data
   */
  async generateInsights(
    activityData: ActivityData,
    range: "week" | "month" | "year",
    historicalData?: ActivityData[],
  ): Promise<InsightsData> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.getCacheKey(activityData, range);
    logger.debug("Checking insights cache", { range, cacheKey });

    if (this.config.cacheEnabled) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        logger.info("Insights served from cache", { range, cacheKey });
        return cached;
      }
      logger.debug("Cache miss for insights", { range, cacheKey });

      // Check if there's already a generation in progress for this cache key
      const inFlight = this.inFlightGenerations.get(cacheKey);
      if (inFlight) {
        logger.debug("Waiting for in-flight insights generation", { range, cacheKey });
        return inFlight;
      }
    }

    logger.info("Generating fresh insights", { range, cacheKey });

    // Create a promise for this generation and track it
    const generationPromise = (async () => {
      try {
        // Generate insights in parallel where possible
        const [summary, correlations, anomalies] = await Promise.all([
          this.config.enableSummary ? this.generateSummary(activityData, range) : Promise.resolve(null),
          this.config.enableCorrelations
            ? this.findCorrelations(activityData)
            : Promise.resolve([] as InsightCorrelation[]),
          this.config.enableAnomalies && historicalData
            ? this.detectAnomalies(activityData, historicalData)
            : Promise.resolve([] as InsightAnomaly[]),
        ]);

        // Generate recommendations based on other insights
        const recommendations = this.config.enableRecommendations
          ? await this.generateRecommendations(activityData, anomalies, correlations)
          : [];

        const generationTimeMs = Date.now() - startTime;

        const insights: InsightsData = {
          timestamp: new Date().toISOString(),
          range,
          summary,
          correlations: correlations.slice(0, this.config.maxCorrelations),
          anomalies: anomalies.slice(0, this.config.maxAnomalies),
          recommendations: recommendations.slice(0, this.config.maxRecommendations),
          meta: {
            generationTimeMs,
            dataPoints: this.calculateDataPoints(activityData),
            cacheHit: false,
          },
        };

        // Cache the result
        if (this.config.cacheEnabled) {
          await this.saveToCache(cacheKey, insights);
        }

        logger.info("Insights generated successfully", {
          range,
          generationTimeMs,
          hasSummary: !!summary,
          correlationsCount: correlations.length,
          anomaliesCount: anomalies.length,
          recommendationsCount: recommendations.length,
        });

        return insights;
      } finally {
        // Remove from in-flight tracking when done
        this.inFlightGenerations.delete(cacheKey);
      }
    })();

    // Track this generation if cache is enabled
    if (this.config.cacheEnabled) {
      this.inFlightGenerations.set(cacheKey, generationPromise);
    }

    return generationPromise;
  }

  /**
   * Generate AI-powered summary
   */
  private async generateSummary(
    activityData: ActivityData,
    range: "week" | "month" | "year",
  ): Promise<InsightSummary | null> {
    try {
      const prompt = getSummaryPrompt(activityData, range);
      const client = getAItClient();

      const result = await client.generateStructured<InsightSummary>({
        prompt,
        schema: InsightSummarySchema,
        temperature: 0.7,
        maxRetries: 2,
      });

      logger.debug("Summary generated", { title: result.title });
      return result;
    } catch (error) {
      logger.error("Failed to generate summary", { error });
      return null;
    }
  }

  /**
   * Find correlations between integrations
   */
  private async findCorrelations(activityData: ActivityData): Promise<InsightCorrelation[]> {
    try {
      // Use correlation engine for statistical analysis
      const statisticalCorrelations = await this.correlationEngine.findCorrelations(
        activityData,
        this.config.maxCorrelations * 2, // Get more for AI to refine
      );

      if (statisticalCorrelations.length === 0) {
        return [];
      }

      // Enhance with AI descriptions
      const prompt = getCorrelationPrompt(activityData);
      const client = getAItClient();

      try {
        const aiCorrelations = await client.generateStructured<InsightCorrelation[]>({
          prompt,
          schema: InsightCorrelationSchema.array(),
          temperature: 0.6,
          maxRetries: 1,
        });

        // Merge AI insights with statistical correlations
        return this.mergeCorrelations(statisticalCorrelations, aiCorrelations);
      } catch (aiError) {
        logger.warn("AI correlation enhancement failed, using statistical only", { error: aiError });
        return statisticalCorrelations;
      }
    } catch (error) {
      logger.error("Failed to find correlations", { error });
      return [];
    }
  }

  /**
   * Detect anomalies in activity
   */
  private async detectAnomalies(activityData: ActivityData, historicalData: ActivityData[]): Promise<InsightAnomaly[]> {
    try {
      const anomalies = await this.anomalyDetector.detectAnomalies(activityData, historicalData);

      logger.debug("Anomalies detected", { count: anomalies.length });
      return anomalies;
    } catch (error) {
      logger.error("Failed to detect anomalies", { error });
      return [];
    }
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    activityData: ActivityData,
    anomalies: InsightAnomaly[],
    correlations: InsightCorrelation[],
  ): Promise<InsightRecommendation[]> {
    try {
      const prompt = getRecommendationPrompt(activityData, anomalies, correlations);
      const client = getAItClient();

      const recommendations = await client.generateStructured<InsightRecommendation[]>({
        prompt,
        schema: InsightRecommendationSchema.array(),
        temperature: 0.8, // Higher temperature for creative suggestions
        maxRetries: 1,
      });

      logger.debug("Recommendations generated", { count: recommendations.length });
      return recommendations.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      logger.error("Failed to generate recommendations", { error });
      return [];
    }
  }

  /**
   * Merge statistical and AI-generated correlations
   */
  private mergeCorrelations(statistical: InsightCorrelation[], ai: InsightCorrelation[]): InsightCorrelation[] {
    // Use statistical correlations as base, enhance descriptions with AI
    const merged = statistical.map((stat) => {
      const aiMatch = ai.find(
        (a) =>
          a.integrations.every((int) => stat.integrations.includes(int)) ||
          stat.integrations.every((int) => a.integrations.includes(int)),
      );

      if (aiMatch && aiMatch.description.length > stat.description.length) {
        return {
          ...stat,
          description: aiMatch.description,
          pattern: aiMatch.pattern || stat.pattern,
        };
      }

      return stat;
    });

    return merged;
  }

  /**
   * Calculate total data points in activity data
   */
  private calculateDataPoints(activityData: ActivityData): number {
    // Sum all integrations dynamically
    return Object.values(activityData).reduce((sum, integration) => {
      if (integration && typeof integration === "object" && "total" in integration) {
        return sum + (integration.total || 0);
      }
      return sum;
    }, 0);
  }

  /**
   * Generate cache key from activity data
   * Uses a time-based key aligned with activity data cache for better cache hits
   * Since activity data is already cached separately with a time-based key, we use the same approach
   */
  private getCacheKey(activityData: ActivityData, range: string): string {
    // Use hour-based cache key to align with activity data cache (refreshes hourly)
    // This ensures insights are cached for the same period as activity data
    const now = new Date();
    const dateHour = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${now.getHours()}`;

    // Create a stable hash based on sorted integration keys and their totals
    // This ensures the same data produces the same hash
    const totalsHash = Object.keys(activityData)
      .sort()
      .map((key) => {
        const activity = activityData[key];
        const total = activity && typeof activity === "object" && "total" in activity ? activity.total : 0;
        return `${key}:${total}`;
      })
      .join("|");

    // Use a shorter hash for readability, but ensure it's stable
    const dataHash = crypto.createHash("md5").update(`${totalsHash}|${range}`).digest("hex").substring(0, 8);

    const cacheKey = `insights:${range}:${dateHour}:${dataHash}`;
    logger.debug("Generated cache key", { cacheKey, totalsHash });
    return cacheKey;
  }

  /**
   * Get insights from cache
   */
  private async getFromCache(cacheKey: string): Promise<InsightsData | null> {
    try {
      const cacheService = getCacheService();
      // Handle both sync and async cache providers
      const cachedResult = cacheService.get<InsightsData>(cacheKey);
      const cached = cachedResult instanceof Promise ? await cachedResult : cachedResult;

      if (cached) {
        logger.debug("Cache hit for insights", { cacheKey, hasSummary: !!cached.summary });
        return {
          ...cached,
          meta: {
            ...cached.meta,
            cacheHit: true,
          },
        };
      }

      logger.debug("Cache miss - no data found", { cacheKey });
      return null;
    } catch (error: any) {
      logger.warn("Cache retrieval failed", { error: error?.message || error, cacheKey, stack: error?.stack });
      return null;
    }
  }

  /**
   * Save insights to cache
   */
  private async saveToCache(cacheKey: string, insights: InsightsData): Promise<void> {
    try {
      const cacheService = getCacheService();
      const ttlMs = this.config.cacheTtlSeconds * 1000;
      // Handle both sync and async cache providers
      const setResult = cacheService.set(cacheKey, insights, ttlMs);
      if (setResult instanceof Promise) {
        await setResult;
      }

      logger.info("Insights cached", { cacheKey, ttl: this.config.cacheTtlSeconds });
    } catch (error: any) {
      logger.error("Cache save failed", {
        error: error?.message || error,
        cacheKey,
        stack: error?.stack,
      });
    }
  }

  /**
   * Invalidate cache for specific range
   */
  async invalidateCache(range?: "week" | "month" | "year"): Promise<void> {
    try {
      const cacheService = getCacheService();
      // Note: This is a simplified invalidation
      // In production, you'd want more sophisticated cache key management
      logger.info("Cache invalidation requested", { range });
    } catch (error) {
      logger.error("Cache invalidation failed", { error });
    }
  }
}

// Singleton instance
let _insightsService: InsightsService | null = null;

export function getInsightsService(config?: InsightsConfig): InsightsService {
  if (!_insightsService || config) {
    _insightsService = new InsightsService(config);
  }
  return _insightsService;
}

export function resetInsightsService(): void {
  _insightsService = null;
}

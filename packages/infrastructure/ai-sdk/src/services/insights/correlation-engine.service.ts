import { getLogger } from "@ait/core";
import type { ActivityData, InsightCorrelation } from "./insights.types";
import { getIntegrationRegistryService } from "./integration-registry.service";

const logger = getLogger();

/**
 * Cross-integration correlation analysis
 */
export class CorrelationEngineService {
  private config: {
    minStrength: number; // Minimum correlation coefficient (0-1)
    minConfidence: number;
  };
  private registry = getIntegrationRegistryService();

  constructor(config: { minStrength?: number; minConfidence?: number } = {}) {
    this.config = {
      minStrength: config.minStrength || 0.5,
      minConfidence: config.minConfidence || 0.6,
    };
  }

  /**
   * Find correlations between different integrations
   */
  async findCorrelations(activityData: ActivityData, maxResults = 3): Promise<InsightCorrelation[]> {
    const correlations: InsightCorrelation[] = [];

    // Generate all possible pairs dynamically from available integrations
    const integrationKeys = Object.keys(activityData).filter((key) => {
      const data = activityData[key];
      return data?.daily && data.daily.length > 0;
    });

    // Generate pairs: all combinations of integrations
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < integrationKeys.length; i++) {
      for (let j = i + 1; j < integrationKeys.length; j++) {
        pairs.push([integrationKeys[i]!, integrationKeys[j]!]);
      }
    }

    logger.debug("Analyzing correlation pairs", { pairs, integrationKeys });

    for (const [integration1, integration2] of pairs) {
      const data1 = activityData[integration1];
      const data2 = activityData[integration2];

      if (!data1 || !data2 || !data1.daily || !data2.daily) continue;

      const correlation = this.calculateCorrelation(integration1, integration2, data1.daily, data2.daily);

      if (correlation && correlation.strength >= this.config.minStrength * 100) {
        correlations.push(correlation);
      }
    }

    // Sort by strength and return top results
    return correlations.sort((a, b) => b.strength - a.strength).slice(0, maxResults);
  }

  /**
   * Calculate Pearson correlation coefficient between two time series
   */
  private calculateCorrelation(
    integration1: string,
    integration2: string,
    series1: Array<{ date: string; count: number }>,
    series2: Array<{ date: string; count: number }>,
  ): InsightCorrelation | null {
    // Align time series by date
    const aligned = this.alignTimeSeries(series1, series2);

    if (aligned.length < 3) {
      // Need at least 3 data points
      return null;
    }

    const values1 = aligned.map((p) => p[0]);
    const values2 = aligned.map((p) => p[1]);

    const coefficient = this.pearsonCorrelation(values1, values2);

    // Filter out weak correlations
    if (Math.abs(coefficient) < this.config.minStrength) {
      return null;
    }

    const strength = Math.round(Math.abs(coefficient) * 100);
    const confidence = this.calculateConfidence(aligned.length, Math.abs(coefficient));

    if (confidence < this.config.minConfidence) {
      return null;
    }

    const pattern = this.detectPattern(integration1, integration2, coefficient, values1, values2);
    const description = this.generateCorrelationDescription(integration1, integration2, coefficient, values1, values2);
    const example = this.generateExample(integration1, integration2, aligned);

    return {
      type: "correlation",
      integrations: [integration1, integration2],
      pattern,
      strength,
      description,
      example,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Align two time series by date
   */
  private alignTimeSeries(
    series1: Array<{ date: string; count: number }>,
    series2: Array<{ date: string; count: number }>,
  ): Array<[number, number]> {
    const map1 = new Map(series1.map((s) => [s.date, s.count]));
    const map2 = new Map(series2.map((s) => [s.date, s.count]));

    const aligned: Array<[number, number]> = [];
    for (const [date, count1] of map1) {
      const count2 = map2.get(date);
      if (count2 !== undefined) {
        aligned.push([count1, count2]);
      }
    }

    return aligned;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const meanX = x.reduce((sum, v) => sum + v, 0) / n;
    const meanY = y.reduce((sum, v) => sum + v, 0) / n;

    let numerator = 0;
    let sumSquaresX = 0;
    let sumSquaresY = 0;

    for (let i = 0; i < n; i++) {
      const deltaX = x[i]! - meanX;
      const deltaY = y[i]! - meanY;
      numerator += deltaX * deltaY;
      sumSquaresX += deltaX * deltaX;
      sumSquaresY += deltaY * deltaY;
    }

    const denominator = Math.sqrt(sumSquaresX * sumSquaresY);

    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  /**
   * Calculate confidence based on sample size and correlation strength
   */
  private calculateConfidence(sampleSize: number, correlation: number): number {
    // Simple confidence calculation based on sample size and correlation strength
    // More samples and stronger correlation = higher confidence

    const sizeFactor = Math.min(sampleSize / 30, 1); // Max out at 30 samples
    const strengthFactor = Math.abs(correlation);

    return sizeFactor * strengthFactor;
  }

  /**
   * Detect correlation pattern type
   */
  private detectPattern(
    integration1: string,
    integration2: string,
    coefficient: number,
    values1: number[],
    values2: number[],
  ): string {
    const avg1 = values1.reduce((s, v) => s + v, 0) / values1.length;
    const avg2 = values2.reduce((s, v) => s + v, 0) / values2.length;

    if (coefficient > 0.7) {
      return "Strong positive correlation";
    }
    if (coefficient > 0.5) {
      return "Moderate positive correlation";
    }
    if (coefficient < -0.7) {
      return "Strong negative correlation";
    }
    if (coefficient < -0.5) {
      return "Moderate negative correlation";
    }

    return "Weak correlation";
  }

  /**
   * Generate human-readable correlation description
   */
  private generateCorrelationDescription(
    integration1: string,
    integration2: string,
    coefficient: number,
    values1: number[],
    values2: number[],
  ): string {
    const label1 = this.registry.getActivityLabel(integration1 as any);
    const label2 = this.registry.getActivityLabel(integration2 as any);

    const avg1 = Math.round(values1.reduce((s, v) => s + v, 0) / values1.length);
    const avg2 = Math.round(values2.reduce((s, v) => s + v, 0) / values2.length);

    if (coefficient > 0.6) {
      // Strong positive correlation
      if (integration1 === "spotify" && integration2 === "github") {
        return `You tend to listen to music while coding - averaging ${avg1} songs during ${avg2} commits`;
      }
      if (integration1 === "slack" && integration2 === "github") {
        return "More team collaboration coincides with higher coding activity";
      }
      if (integration1 === "x" && integration2 === "slack") {
        return "Your social media and work communication patterns align closely";
      }

      return `When your ${label1} increases, ${label2} tends to increase as well`;
    }

    if (coefficient < -0.6) {
      // Strong negative correlation
      if (integration1 === "spotify" && integration2 === "slack") {
        return "You listen to more music during focused work (less Slack interruptions)";
      }
      if (integration1 === "github" && integration2 === "x") {
        return "Deep coding sessions mean less social media - great focus discipline!";
      }

      return `Higher ${label1} correlates with lower ${label2} - interesting trade-off`;
    }

    return `Your ${label1} and ${label2} show some connection`;
  }

  /**
   * Generate concrete example from data
   */
  private generateExample(
    integration1: string,
    integration2: string,
    aligned: Array<[number, number]>,
  ): string | undefined {
    if (aligned.length === 0) return undefined;

    // Find a day with notable activity in both
    const maxIndex = aligned.reduce((maxIdx, pair, idx, arr) => {
      const currentSum = pair[0] + pair[1];
      const maxSum = arr[maxIdx]![0] + arr[maxIdx]![1];
      return currentSum > maxSum ? idx : maxIdx;
    }, 0);

    const [count1, count2] = aligned[maxIndex]!;

    if (count1 === 0 || count2 === 0) return undefined;

    const unit1 = this.registry.getUnitLabel(integration1 as any);
    const unit2 = this.registry.getUnitLabel(integration2 as any);

    return `${count1} ${unit1} paired with ${count2} ${unit2}`;
  }

  /**
   * Detect time-based patterns (e.g., activity peaks at same time)
   */
  async detectTemporalPatterns(activityData: ActivityData): Promise<{
    peakHoursAlign: boolean;
    weekdayPatternMatch: boolean;
    consistencyScore: number;
  }> {
    // Placeholder for temporal analysis
    // In production, you'd analyze hourly activity patterns

    return {
      peakHoursAlign: false,
      weekdayPatternMatch: false,
      consistencyScore: 0,
    };
  }

  /**
   * Find activity clustering (days with high activity across all integrations)
   */
  findActivityClusters(activityData: ActivityData): Array<{
    date: string;
    totalActivity: number;
    breakdown: Record<string, number>;
  }> {
    const dateMap = new Map<string, Record<string, number>>();

    // Aggregate all activities by date - iterate over all keys dynamically
    const integrationKeys = Object.keys(activityData);

    for (const integration of integrationKeys) {
      const data = activityData[integration];
      if (!data || !data.daily) continue;

      for (const day of data.daily) {
        if (!dateMap.has(day.date)) {
          dateMap.set(day.date, {});
        }
        const breakdown = dateMap.get(day.date)!;
        breakdown[integration] = day.count;
      }
    }

    // Convert to array and calculate totals
    const clusters = Array.from(dateMap.entries()).map(([date, breakdown]) => ({
      date,
      totalActivity: Object.values(breakdown).reduce((sum, count) => sum + count, 0),
      breakdown,
    }));

    // Sort by total activity
    return clusters.sort((a, b) => b.totalActivity - a.totalActivity);
  }
}

// Singleton instance
let _correlationEngineService: CorrelationEngineService | null = null;

export function getCorrelationEngineService(config?: {
  minStrength?: number;
  minConfidence?: number;
}): CorrelationEngineService {
  if (!_correlationEngineService || config) {
    _correlationEngineService = new CorrelationEngineService(config);
  }
  return _correlationEngineService;
}

export function resetCorrelationEngineService(): void {
  _correlationEngineService = null;
}

import type { ActivityData, InsightAnomaly } from "./insights.types";
import { getLogger } from "@ait/core";
import { getIntegrationRegistryService } from "./integration-registry.service";

const logger = getLogger();

/**
 * Statistical anomaly detection for activity patterns
 */
export class AnomalyDetectorService {
  private config: {
    threshold: number; // Standard deviations
    minDataPoints: number;
  };
  private registry = getIntegrationRegistryService();

  constructor(config: { threshold?: number; minDataPoints?: number } = {}) {
    this.config = {
      threshold: config.threshold || 2,
      minDataPoints: config.minDataPoints || 3,
    };
  }

  /**
   * Detect anomalies in activity data
   */
  async detectAnomalies(currentData: ActivityData, historicalData: ActivityData[]): Promise<InsightAnomaly[]> {
    const anomalies: InsightAnomaly[] = [];

    if (historicalData.length < this.config.minDataPoints) {
      logger.warn("Insufficient historical data for anomaly detection", {
        available: historicalData.length,
        required: this.config.minDataPoints,
      });
      return anomalies;
    }

    // Check each integration for anomalies - iterate over all keys dynamically
    const integrationKeys = Object.keys(currentData);

    for (const integration of integrationKeys) {
      const current = currentData[integration];
      if (!current) continue;

      const anomaly = this.detectIntegrationAnomaly(
        integration,
        current.total,
        historicalData,
        integration as keyof ActivityData,
      );

      if (anomaly) {
        anomalies.push(anomaly);
      }
    }

    // Sort by severity and deviation
    return anomalies.sort((a, b) => {
      const severityWeight = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return Math.abs(b.deviation) - Math.abs(a.deviation);
    });
  }

  /**
   * Detect anomaly for a specific integration
   */
  private detectIntegrationAnomaly(
    integration: string,
    currentValue: number,
    historicalData: ActivityData[],
    dataKey: keyof ActivityData,
  ): InsightAnomaly | null {
    // Calculate historical statistics
    const historicalValues = historicalData
      .map((d) => d[dataKey]?.total || 0)
      .filter((v) => v !== undefined && v !== null);

    if (historicalValues.length === 0) return null;

    const stats = this.calculateStatistics(historicalValues);
    const zScore = this.calculateZScore(currentValue, stats.mean, stats.stdDev);

    // Check if anomaly (beyond threshold)
    if (Math.abs(zScore) < this.config.threshold) {
      return null;
    }

    const direction: "spike" | "drop" = zScore > 0 ? "spike" : "drop";
    const severity = this.classifySeverity(Math.abs(zScore));
    const percentChange = ((currentValue - stats.mean) / stats.mean) * 100;

    return {
      type: "anomaly",
      integration,
      metric: "total_activity",
      deviation: zScore,
      description: this.generateAnomalyDescription(integration, direction, percentChange, currentValue),
      severity,
      direction,
      historical: {
        mean: Math.round(stats.mean * 10) / 10,
        stdDev: Math.round(stats.stdDev * 10) / 10,
        current: currentValue,
      },
    };
  }

  /**
   * Calculate mean and standard deviation
   */
  private calculateStatistics(values: number[]): { mean: number; stdDev: number } {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    const squaredDiffs = values.map((v) => (v - mean) ** 2);
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  /**
   * Calculate Z-score
   */
  private calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  /**
   * Classify anomaly severity based on z-score
   */
  private classifySeverity(absZScore: number): "low" | "medium" | "high" {
    if (absZScore >= 3) return "high";
    if (absZScore >= 2.5) return "medium";
    return "low";
  }

  /**
   * Generate human-readable anomaly description
   */
  private generateAnomalyDescription(
    integration: string,
    direction: "spike" | "drop",
    percentChange: number,
    currentValue: number,
  ): string {
    const label = this.registry.getActivityLabel(integration as any);
    const absPercent = Math.abs(Math.round(percentChange));

    if (direction === "spike") {
      if (absPercent > 100) {
        return `Your ${label} spiked ${absPercent}% above normal (${currentValue} total) - exceptionally active!`;
      }
      return `Your ${label} increased ${absPercent}% above your average this period`;
    }

    if (absPercent > 80) {
      return `Your ${label} dropped ${absPercent}% - taking a break?`;
    }

    if (currentValue === 0) {
      return `No ${label} detected this period - unusual silence`;
    }

    return `Your ${label} decreased ${absPercent}% below your typical activity`;
  }

  /**
   * Check for streak breaks (consecutive periods with activity)
   */
  detectStreakBreak(
    currentData: ActivityData,
    integration: keyof ActivityData,
    minStreak = 3,
  ): { broken: boolean; previousStreak: number } | null {
    const current = currentData[integration];
    if (!current || !current.daily) return null;

    let streak = 0;
    const dailyData = [...current.daily].reverse();

    // Check if current period breaks streak
    if (dailyData[0] && dailyData[0].count === 0) {
      // Count previous streak
      for (let i = 1; i < dailyData.length; i++) {
        if (dailyData[i] && dailyData[i]?.count! > 0) {
          streak++;
        } else {
          break;
        }
      }

      if (streak >= minStreak) {
        return { broken: true, previousStreak: streak };
      }
    }

    return null;
  }

  /**
   * Detect patterns in daily activity
   */
  detectDailyPattern(activityData: ActivityData): {
    hasWeekendDrop: boolean;
    hasMidweekSpike: boolean;
    consistencyScore: number;
  } {
    // This is a simplified pattern detection
    // In production, you'd want more sophisticated time-series analysis

    // Aggregate all daily data from all integrations dynamically
    const allDays: Array<{ date: string; count: number }> = [];
    const integrationKeys = Object.keys(activityData);

    for (const integration of integrationKeys) {
      const data = activityData[integration];
      if (data?.daily) {
        allDays.push(...data.daily);
      }
    }

    if (allDays.length === 0) {
      return { hasWeekendDrop: false, hasMidweekSpike: false, consistencyScore: 0 };
    }

    // Calculate consistency (coefficient of variation)
    const counts = allDays.map((d) => d.count);
    const stats = this.calculateStatistics(counts);
    const consistencyScore = stats.stdDev === 0 ? 100 : Math.max(0, 100 - (stats.stdDev / stats.mean) * 100);

    return {
      hasWeekendDrop: false, // Placeholder - would need day-of-week info
      hasMidweekSpike: false, // Placeholder
      consistencyScore: Math.round(consistencyScore),
    };
  }
}

// Singleton instance
let _anomalyDetectorService: AnomalyDetectorService | null = null;

export function getAnomalyDetectorService(config?: {
  threshold?: number;
  minDataPoints?: number;
}): AnomalyDetectorService {
  if (!_anomalyDetectorService || config) {
    _anomalyDetectorService = new AnomalyDetectorService(config);
  }
  return _anomalyDetectorService;
}

export function resetAnomalyDetectorService(): void {
  _anomalyDetectorService = null;
}

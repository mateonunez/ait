import { type ActivityData, type InsightAnomaly, type IntegrationVendor, getLogger } from "@ait/core";
import { getIntegrationRegistryService } from "./integration-registry.service";

const logger = getLogger();

export interface AnomalyDetectorConfig {
  threshold?: number; // Standard deviations
  minDataPoints?: number;
}

export class AnomalyDetectorService {
  private threshold: number;
  private minDataPoints: number;
  private registry = getIntegrationRegistryService();

  constructor(config: AnomalyDetectorConfig = {}) {
    this.threshold = config.threshold || 2.0;
    this.minDataPoints = config.minDataPoints || 3;
  }

  async detectAnomalies(currentData: ActivityData, historicalData: ActivityData[]): Promise<InsightAnomaly[]> {
    if (historicalData.length < this.minDataPoints) {
      logger.debug("Insufficient historical data for anomaly detection", {
        available: historicalData.length,
        required: this.minDataPoints,
      });
      return [];
    }

    const anomalies: InsightAnomaly[] = [];

    for (const vendor of Object.keys(currentData) as IntegrationVendor[]) {
      const current = currentData[vendor]?.total || 0;
      const historicalValues = historicalData.map((d) => d[vendor]?.total || 0);

      const anomaly = this._analyzeMetric(vendor, current, historicalValues);
      if (anomaly) anomalies.push(anomaly);
    }

    return anomalies.sort((a, b) => {
      const severityMap = { high: 3, medium: 2, low: 1 };
      return severityMap[b.severity] - severityMap[a.severity] || Math.abs(b.deviation) - Math.abs(a.deviation);
    });
  }

  private _analyzeMetric(vendor: IntegrationVendor, current: number, historical: number[]): InsightAnomaly | null {
    if (historical.length === 0) return null;

    const { mean, stdDev } = this._calculateStats(historical);
    if (stdDev === 0) return null;

    const zScore = (current - mean) / stdDev;
    if (Math.abs(zScore) < this.threshold) return null;

    const severity = Math.abs(zScore) >= 3 ? "high" : Math.abs(zScore) >= 2.5 ? "medium" : "low";
    const percentChange = ((current - mean) / (mean || 1)) * 100;

    return {
      type: "anomaly",
      integration: vendor,
      metric: "total_activity",
      deviation: zScore,
      severity,
      direction: zScore > 0 ? "spike" : "drop",
      description: this._generateDescription(vendor, zScore, percentChange, current),
      historical: {
        mean: Math.round(mean * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        current,
      },
    };
  }

  private _calculateStats(values: number[]): { mean: number; stdDev: number } {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return { mean, stdDev: Math.sqrt(variance) };
  }

  private _generateDescription(vendor: IntegrationVendor, zScore: number, percent: number, current: number): string {
    const label = this.registry.getActivityLabel(vendor);
    const absPercent = Math.abs(Math.round(percent));
    const direction = zScore > 0 ? "spike" : "drop";

    if (direction === "spike") {
      return absPercent > 100
        ? `Exceptional spike in ${label}: ${absPercent}% above average (${current} total)`
        : `Your ${label} increased by ${absPercent}% compared to your usual levels`;
    }

    return current === 0
      ? `No ${label} detected this period - significant drop from baseline`
      : `Your ${label} decreased by ${absPercent}% below average`;
  }
}

let instance: AnomalyDetectorService | null = null;

export function getAnomalyDetectorService(config?: AnomalyDetectorConfig): AnomalyDetectorService {
  if (!instance || config) instance = new AnomalyDetectorService(config);
  return instance;
}

export function resetAnomalyDetectorService(): void {
  instance = null;
}

import { type ActivityData, type InsightCorrelation, type IntegrationVendor, getLogger } from "@ait/core";
import { getIntegrationRegistryService } from "./integration-registry.service";

const logger = getLogger();

export interface CorrelationEngineConfig {
  minStrength?: number; // Minimum correlation coefficient (0-1)
  minConfidence?: number;
}

export class CorrelationEngineService {
  private minStrength: number;
  private minConfidence: number;
  private registry = getIntegrationRegistryService();

  constructor(config: CorrelationEngineConfig = {}) {
    this.minStrength = config.minStrength || 0.5;
    this.minConfidence = config.minConfidence || 0.6;
  }

  async findCorrelations(activityData: ActivityData, maxResults = 3): Promise<InsightCorrelation[]> {
    const vendors = Object.keys(activityData).filter((v) => {
      const d = activityData[v as IntegrationVendor];
      return (d?.daily?.length ?? 0) >= 3;
    }) as IntegrationVendor[];

    const correlations: InsightCorrelation[] = [];

    for (let i = 0; i < vendors.length; i++) {
      for (let j = i + 1; j < vendors.length; j++) {
        const v1 = vendors[i]!;
        const v2 = vendors[j]!;
        const correlation = this._analyzePair(v1, v2, activityData[v1]!.daily, activityData[v2]!.daily);
        if (correlation) correlations.push(correlation);
      }
    }

    return correlations.sort((a, b) => b.strength - a.strength).slice(0, maxResults);
  }

  private _analyzePair(
    v1: IntegrationVendor,
    v2: IntegrationVendor,
    s1: Array<{ date: string; count: number }>,
    s2: Array<{ date: string; count: number }>,
  ): InsightCorrelation | null {
    const aligned = this._align(s1, s2);
    if (aligned.length < 3) return null;

    const x = aligned.map((p) => p[0]);
    const y = aligned.map((p) => p[1]);

    const coefficient = this._pearson(x, y);
    if (Math.abs(coefficient) < this.minStrength) return null;

    const confidence = Math.min(aligned.length / 30, 1) * Math.abs(coefficient);
    if (confidence < this.minConfidence) return null;

    return {
      type: "correlation",
      integrations: [v1, v2],
      pattern: this._getPattern(coefficient),
      strength: Math.round(Math.abs(coefficient) * 100),
      description: this._generateDescription(v1, v2, coefficient, x, y),
      example: this._generateExample(v1, v2, aligned),
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  private _align(
    s1: Array<{ date: string; count: number }>,
    s2: Array<{ date: string; count: number }>,
  ): Array<[number, number]> {
    const m1 = new Map(s1.map((s) => [s.date, s.count]));
    const m2 = new Map(s2.map((s) => [s.date, s.count]));
    const aligned: Array<[number, number]> = [];

    for (const [date, val1] of m1) {
      if (m2.has(date)) aligned.push([val1, m2.get(date)!]);
    }
    return aligned;
  }

  private _pearson(x: number[], y: number[]): number {
    const n = x.length;
    const mx = x.reduce((a, b) => a + b) / n;
    const my = y.reduce((a, b) => a + b) / n;

    let num = 0;
    let den1 = 0;
    let den2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i]! - mx;
      const dy = y[i]! - my;
      num += dx * dy;
      den1 += dx * dx;
      den2 += dy * dy;
    }
    const den = Math.sqrt(den1 * den2);
    return den === 0 ? 0 : num / den;
  }

  private _getPattern(coeff: number): string {
    if (Math.abs(coeff) > 0.7) return coeff > 0 ? "Strong positive" : "Strong negative";
    return coeff > 0 ? "Moderate positive" : "Moderate negative";
  }

  private _generateDescription(
    v1: IntegrationVendor,
    v2: IntegrationVendor,
    coeff: number,
    x: number[],
    y: number[],
  ): string {
    const l1 = this.registry.getActivityLabel(v1);
    const l2 = this.registry.getActivityLabel(v2);

    if (coeff > 0.6) return `When your ${l1} increases, ${l2} tends to follow - a positive synergy in your workflow.`;
    if (coeff < -0.6) return `You seem to balance ${l1} and ${l2} - when one is high, the other tends to be lower.`;
    return `There is a subtle connection between your ${l1} and ${l2} patterns.`;
  }

  private _generateExample(v1: IntegrationVendor, v2: IntegrationVendor, aligned: Array<[number, number]>): string {
    const [c1, c2] = aligned.reduce((a, b) => (a[0] + a[1] > b[0] + b[1] ? a : b));
    return `${c1} ${this.registry.getUnitLabel(v1)} paired with ${c2} ${this.registry.getUnitLabel(v2)} on a peak day.`;
  }
}

let instance: CorrelationEngineService | null = null;

export function getCorrelationEngineService(config?: CorrelationEngineConfig): CorrelationEngineService {
  if (!instance || config) instance = new CorrelationEngineService(config);
  return instance;
}

export function resetCorrelationEngineService(): void {
  instance = null;
}

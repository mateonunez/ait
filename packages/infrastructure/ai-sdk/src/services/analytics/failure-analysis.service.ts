import type { ClassifiedError } from "../errors/error-classification.service";
import type { ErrorStats } from "./types";

interface ErrorRecord {
  error: ClassifiedError;
  timestamp: number;
  retryAttempt: number;
  resolved: boolean;
}

/**
 * Service for analyzing failure patterns and trends
 */
export class FailureAnalysisService {
  private errorRecords: ErrorRecord[] = [];
  private readonly maxRecords = 10000;

  /**
   * Record an error occurrence
   */
  recordError(error: ClassifiedError, retryAttempt = 0): void {
    this.errorRecords.push({
      error,
      timestamp: Date.now(),
      retryAttempt,
      resolved: false,
    });

    // Keep only recent records
    if (this.errorRecords.length > this.maxRecords) {
      this.errorRecords = this.errorRecords.slice(-this.maxRecords);
    }
  }

  /**
   * Mark an error as resolved (successful retry)
   */
  markResolved(errorFingerprint: string): void {
    const record = this.errorRecords
      .slice()
      .reverse()
      .find((r) => r.error.fingerprint === errorFingerprint && !r.resolved);

    if (record) {
      record.resolved = true;
    }
  }

  /**
   * Get error statistics grouped by category
   */
  getErrorStatsByCategory(windowMs = 60 * 60 * 1000): ErrorStats[] {
    const cutoff = Date.now() - windowMs;
    const recentErrors = this.errorRecords.filter((r) => r.timestamp > cutoff);

    if (recentErrors.length === 0) return [];

    // Group by category
    const categoryMap = new Map<string, ErrorRecord[]>();
    for (const record of recentErrors) {
      const category = record.error.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(record);
    }

    // Convert to stats
    const stats: ErrorStats[] = [];
    for (const [category, records] of categoryMap.entries()) {
      const fingerprints = [...new Set(records.map((r) => r.error.fingerprint))];
      const firstError = records[0]?.error;

      stats.push({
        category,
        count: records.length,
        percentage: (records.length / recentErrors.length) * 100,
        fingerprints,
        isRetryable: firstError?.isRetryable ?? false,
        suggestedAction: firstError?.suggestedAction ?? undefined,
      });
    }

    // Sort by count descending
    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * Get error statistics grouped by fingerprint
   */
  getErrorStatsByFingerprint(windowMs = 60 * 60 * 1000): Map<string, number> {
    const cutoff = Date.now() - windowMs;
    const recentErrors = this.errorRecords.filter((r) => r.timestamp > cutoff);

    const fingerprintCounts = new Map<string, number>();
    for (const record of recentErrors) {
      const fp = record.error.fingerprint;
      fingerprintCounts.set(fp, (fingerprintCounts.get(fp) || 0) + 1);
    }

    return fingerprintCounts;
  }

  /**
   * Get retry success rate for retryable errors
   */
  getRetrySuccessRate(windowMs = 60 * 60 * 1000): number {
    const cutoff = Date.now() - windowMs;
    const recentRetries = this.errorRecords.filter((r) => r.timestamp > cutoff && r.retryAttempt > 0);

    if (recentRetries.length === 0) return 0;

    const successful = recentRetries.filter((r) => r.resolved).length;
    return (successful / recentRetries.length) * 100;
  }

  /**
   * Get average retry attempts before success
   */
  getAverageRetryAttempts(windowMs = 60 * 60 * 1000): number {
    const cutoff = Date.now() - windowMs;
    const resolvedErrors = this.errorRecords.filter((r) => r.timestamp > cutoff && r.resolved && r.retryAttempt > 0);

    if (resolvedErrors.length === 0) return 0;

    const totalAttempts = resolvedErrors.reduce((sum, r) => sum + r.retryAttempt, 0);
    return totalAttempts / resolvedErrors.length;
  }

  /**
   * Get most frequent errors
   */
  getTopErrors(
    limit = 10,
    windowMs = 60 * 60 * 1000,
  ): Array<{ fingerprint: string; count: number; example: ClassifiedError }> {
    const fingerprintCounts = this.getErrorStatsByFingerprint(windowMs);

    const sorted = Array.from(fingerprintCounts.entries())
      .map(([fingerprint, count]) => {
        const example = this.errorRecords
          .filter((r) => r.error.fingerprint === fingerprint)
          .sort((a, b) => b.timestamp - a.timestamp)[0]?.error;

        return { fingerprint, count, example: example! };
      })
      .filter((entry) => entry.example)
      .sort((a, b) => b.count - a.count);

    return sorted.slice(0, limit);
  }

  /**
   * Detect error spikes (sudden increase in error rate)
   */
  detectErrorSpikes(thresholdMultiplier = 3): boolean {
    const last5Min = Date.now() - 5 * 60 * 1000;
    const last30Min = Date.now() - 30 * 60 * 1000;

    const recent5MinErrors = this.errorRecords.filter((r) => r.timestamp > last5Min).length;
    const recent30MinErrors = this.errorRecords.filter((r) => r.timestamp > last30Min).length;

    const recentRate = recent5MinErrors / 5; // errors per minute
    const baselineRate = recent30MinErrors / 30; // errors per minute

    return recentRate > baselineRate * thresholdMultiplier;
  }

  /**
   * Get error timeline (errors per time bucket)
   */
  getErrorTimeline(bucketSizeMs = 60 * 1000, windowMs = 60 * 60 * 1000): Array<{ timestamp: number; count: number }> {
    const cutoff = Date.now() - windowMs;
    const recentErrors = this.errorRecords.filter((r) => r.timestamp > cutoff);

    const buckets = new Map<number, number>();
    for (const record of recentErrors) {
      const bucket = Math.floor(record.timestamp / bucketSizeMs) * bucketSizeMs;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    return Array.from(buckets.entries())
      .map(([timestamp, count]) => ({ timestamp, count }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Reset all error records
   */
  reset(): void {
    this.errorRecords = [];
  }

  /**
   * Get total error count
   */
  getTotalErrors(windowMs?: number): number {
    if (!windowMs) return this.errorRecords.length;

    const cutoff = Date.now() - windowMs;
    return this.errorRecords.filter((r) => r.timestamp > cutoff).length;
  }
}

// Singleton instance
let _failureAnalysisService: FailureAnalysisService | null = null;

export function getFailureAnalysisService(): FailureAnalysisService {
  if (!_failureAnalysisService) {
    _failureAnalysisService = new FailureAnalysisService();
  }
  return _failureAnalysisService;
}

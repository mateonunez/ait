export function getHealthStatus(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

export function parseWindowMs(windowParam: string | undefined, defaultMinutes = 60): number {
  const windowMinutes = Number.parseInt(windowParam || String(defaultMinutes), 10);
  return windowMinutes * 60 * 1000;
}

export function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatDollars(amount: number, decimals = 4): string {
  return `$${amount.toFixed(decimals)}`;
}

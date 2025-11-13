export const RATE_LIMIT_DELAYS = {
  /**
   * GitHub: 5,000 requests/hour for authenticated users
   * 3600000ms / 5000 = 720ms per request
   */
  GITHUB: 720,

  /**
   * Spotify: 300 requests/15 seconds
   * 15000ms / 300 = 50ms per request, but use 100ms for safety margin
   */
  SPOTIFY: 100,

  /**
   * Linear: 10,000 requests/hour
   * 3600000ms / 10000 = 360ms per request, but use 400ms for safety margin
   */
  LINEAR: 400,

  /**
   * X (Twitter): 300 requests/15 minutes
   * 900000ms / 300 = 3000ms per request
   */
  X: 3000,
} as const;

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const rateLimitDelays = {
  github: () => delay(RATE_LIMIT_DELAYS.GITHUB),
  spotify: () => delay(RATE_LIMIT_DELAYS.SPOTIFY),
  linear: () => delay(RATE_LIMIT_DELAYS.LINEAR),
  x: () => delay(RATE_LIMIT_DELAYS.X),
};

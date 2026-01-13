/**
 * Sorts results by score in descending order and applies limit.
 * Expects items to have a 'score' property.
 */
export function rankAndLimit<T extends { score?: number }>(items: T[], limit: number): T[] {
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
}

/**
 * Sorts results by score in descending order and applies limit.
 * Expects items to have a 'score' property.
 */
export function rankAndLimit<T extends { score?: number }>(items: T[], limit: number): T[] {
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
}

/**
 * Deduplicates array items based on a key function.
 * Keeps the first occurrence of each key.
 */
export function deduplicateBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

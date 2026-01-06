/**
 * Recursively sorts object keys for deterministic JSON stringification.
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  if (typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return obj;
}

/**
 * Produces a deterministic JSON string by sorting object keys at all levels.
 * Handles Date objects by converting to ISO strings.
 */
export function stableStringify(obj: unknown): string {
  const sorted = sortObjectKeys(obj);
  return JSON.stringify(sorted);
}

/**
 * Normalizes a date value to ISO string format.
 */
export function normalizeDate(date: string | Date | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === "string") return date;
  return date.toISOString();
}

/**
 * Truncate a string to the specified maximum length.
 */
export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;
}

/**
 * Safely get the size of a JSON stringified value.
 * Returns undefined if stringification fails.
 */
export function safeJsonSize(value: unknown): number | undefined {
  try {
    return JSON.stringify(value).length;
  } catch {
    return undefined;
  }
}

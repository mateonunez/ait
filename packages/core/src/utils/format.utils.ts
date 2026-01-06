import { truncate } from "./string.utils";

const DEFAULT_MAX_LENGTH = 8000;
const DEFAULT_PREVIEW_COUNT = 10;

/**
 * Format a value for inclusion in tool results or logging.
 * Handles arrays, objects with `results` property, and primitives.
 */
export function formatValue(
  value: unknown,
  maxLength = DEFAULT_MAX_LENGTH,
  previewCount = DEFAULT_PREVIEW_COUNT,
): string {
  if (value == null) return "";

  try {
    if (Array.isArray(value)) {
      return formatArray(value, maxLength, previewCount);
    }

    if (typeof value === "object") {
      return formatObject(value as Record<string, unknown>, maxLength, previewCount);
    }

    return truncate(String(value), maxLength);
  } catch {
    return truncate(String(value), maxLength);
  }
}

/**
 * Format an array with a preview and count suffix.
 */
export function formatArray(arr: unknown[], maxLength: number, previewCount: number): string {
  const preview = arr.slice(0, previewCount);
  const suffix = arr.length > previewCount ? `, and ${arr.length - previewCount} more` : "";
  const json = JSON.stringify(preview, null, 2);
  return truncate(json, maxLength) + suffix;
}

/**
 * Format an object, with special handling for paginated results.
 */
export function formatObject(obj: Record<string, unknown>, maxLength: number, previewCount: number): string {
  // Handle paginated results pattern
  if (Array.isArray(obj.results)) {
    const preview = (obj.results as unknown[]).slice(0, previewCount);
    const count = (obj.count as number) ?? obj.results.length;
    const json = JSON.stringify({ count, preview }, null, 2);
    return truncate(json, maxLength);
  }

  // Generic object
  const json = JSON.stringify(obj, null, 2);
  return truncate(json, maxLength);
}

import type { ConnectorLevels } from "../../../types/domain/mappers/connector.mapper.interface";
import { AItError } from "@ait/core";

export interface PassThroughLevelOptions<T> {
  /**
   * A fallback value or a function returning a fallback value.
   */
  fallback?: T | (() => T);
  /**
   * A function to transform the value.
   */
  transform?: (value: T) => T;
}

/**
 * Options may be provided per connector level.
 */
export type PassThroughOptions<T> = Partial<Record<ConnectorLevels, PassThroughLevelOptions<T>>>;

/**
 * Retrieves a fallback value.
 * If the provided fallback is a function, it calls the function; otherwise it returns the value.
 */
function getFallback<T>(fallback: T | (() => T) | undefined): T | undefined {
  if (fallback === undefined) return undefined;
  return typeof fallback === "function" ? (fallback as () => T)() : fallback;
}

/**
 * A pass–through mapper helper that returns a defined value.
 *
 * This version is generic over:
 *  - FieldName: The name of the field to map.
 *  - Value: The (possibly undefined) type of that field.
 *  - External: The external entity type.
 *  - Domain: The domain entity type.
 *  - DataTarget: The data target entity type.
 *
 * Instead of requiring that each source type already declares the field,
 * the mapping functions expect the source type augmented with an optional property.
 *
 * @param fieldName The name of the field to map.
 * @param options Optional per–level options (fallback or transform).
 * @param defaultFactory An optional factory function that returns a default value.
 */
export function connectorMapperPassThrough<FieldName extends string, Value, External, Domain, DataTarget>(
  fieldName: FieldName,
  options: PassThroughOptions<Value> = {},
  defaultFactory?: () => Value,
): {
  external: (entity: External & { [K in FieldName]?: Value }) => NonNullable<Value>;
  domain: (entity: Domain & { [K in FieldName]?: Value }) => NonNullable<Value>;
  dataTarget: (entity: DataTarget & { [K in FieldName]?: Value }) => NonNullable<Value>;
} {
  // A helper factory that creates a mapping function for a given level.
  function mapperForLevel<E>(level: ConnectorLevels): (entity: E & { [K in FieldName]?: Value }) => NonNullable<Value> {
    return (entity: E & { [K in FieldName]?: Value }): NonNullable<Value> => {
      let value: Value | undefined = entity[fieldName];
      const levelOpts = options[level] ?? {};

      // Try the per–level fallback.
      if (value === undefined) {
        value = getFallback(levelOpts.fallback);
      }

      // Try the global default factory if provided.
      if (value === undefined && defaultFactory !== undefined) {
        value = defaultFactory();
      }

      if (value === undefined) {
        throw new AItError("MAPPER_MISSING_VALUE", `Missing value for field "${fieldName}" at level "${level}".`);
      }

      // Apply transform if provided.
      if (levelOpts.transform) {
        value = levelOpts.transform(value);
      }

      return value as NonNullable<Value>;
    };
  }

  return {
    external: mapperForLevel<External>("external"),
    domain: mapperForLevel<Domain>("domain"),
    dataTarget: mapperForLevel<DataTarget>("dataTarget"),
  };
}

/**
 * Maps an object's entries to a string array in the format "key: value".
 *
 * @param obj The object to map.
 * @param valueTransform A transform function to convert each value to a string.
 * @returns Array of strings in the format "key: value".
 */
export function mapObjectToStringArray<T extends Record<string, any>>(
  obj: T | null | undefined,
  valueTransform: (value: T[keyof T], key: string) => string,
): string[];

/**
 * Maps an object's entries to a string array in the format "key: value".
 *
 * @param obj The object to map.
 * @param options Optional configuration:
 *  - valueTransform: A function to transform the value (receives both value and key).
 *  - filterEmpty: If true, filters out any entries that result in an empty string.
 *  - maxDepth: The maximum depth to stringify nested objects (default is 3).
 *  - excludeKeys: An array of keys to exclude from the output (applied recursively).
 * @returns Array of strings in the format "key: value".
 */
export function mapObjectToStringArray<T extends Record<string, any>>(
  obj: T | null | undefined,
  options?: {
    valueTransform?: (value: T[keyof T], key: string) => string;
    filterEmpty?: boolean;
    maxDepth?: number;
    excludeKeys?: string[];
  },
): string[];

export function mapObjectToStringArray<T extends Record<string, any>>(
  obj: T | null | undefined,
  optionsOrTransform?:
    | ((value: T[keyof T], key: string) => string)
    | {
        valueTransform?: (value: T[keyof T], key: string) => string;
        filterEmpty?: boolean;
        maxDepth?: number;
        excludeKeys?: string[];
      },
): string[] {
  if (obj == null) return [];

  // Normalize options: if a function is passed, wrap it in an object.
  const options =
    typeof optionsOrTransform === "function" ? { valueTransform: optionsOrTransform } : optionsOrTransform || {};

  const maxDepth = options.maxDepth ?? 3;

  // Helper: recursively remove keys specified in options.excludeKeys.
  const applyExclusions = (value: any): any => {
    if (!options.excludeKeys || options.excludeKeys.length === 0) return value;

    if (Array.isArray(value)) {
      return value.map(applyExclusions);
    }

    if (value && typeof value === "object") {
      const newObj: any = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          if (!options.excludeKeys.includes(key)) {
            newObj[key] = applyExclusions(value[key]);
          }
        }
      }
      return newObj;
    }
    return value;
  };

  /**
   * Recursively converts a value to a string representation,
   * respecting the maximum depth, handling circular references,
   * and excluding keys defined in options.excludeKeys.
   *
   * @param value The value to stringify.
   * @param depth The current recursion depth.
   * @param seen A WeakSet tracking seen objects to detect circular references.
   * @returns A string representation of the value.
   */
  const safeStringify = (value: unknown, depth: number, seen: WeakSet<object>): string => {
    if (value === null) return "null";
    if (typeof value !== "object") return String(value);

    // If we've reached the exact max depth, summarize the object.
    if (depth === maxDepth) {
      return Array.isArray(value)
        ? `[Array with ${value.length} items]`
        : `[Object with ${Object.keys(value).length} keys]`;
    }

    if (seen.has(value as object)) return "[Circular]";
    seen.add(value as object);

    let result: string;
    if (Array.isArray(value)) {
      const items = value.map((item) => safeStringify(item, depth + 1, seen));
      result = `[${items.join(", ")}]`;
    } else {
      const entries = Object.entries(value)
        // Exclude keys if specified.
        .filter(([k]) => !options.excludeKeys?.includes(k))
        .map(([k, v]) => `${k}: ${safeStringify(v, depth + 1, seen)}`);
      result = `{${entries.join(", ")}}`;
    }
    seen.delete(value as object);
    return result;
  };

  // Create a single seen set for the entire mapping.
  const seen = new WeakSet<object>();
  seen.add(obj);

  const entries = Object.entries(obj)
    .filter(([key]) => !options.excludeKeys?.includes(key))
    .map(([key, value]) => {
      let transformedValue: string;
      if (options.valueTransform) {
        // Apply exclusions before the custom transformation.
        const filteredValue = applyExclusions(value);
        transformedValue = options.valueTransform(filteredValue, key);
      } else {
        // Start recursion at depth 1.
        transformedValue = safeStringify(value, 1, seen);
      }
      return `${key}: ${transformedValue}`;
    });

  return options.filterEmpty ? entries.filter((entry) => entry.trim().length > 0) : entries;
}

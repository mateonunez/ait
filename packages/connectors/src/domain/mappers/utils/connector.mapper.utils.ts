import type { ConnectorLevels } from "@/types/domain/mappers/connector.mapper.interface";

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
        throw new Error(`Missing value for field "${fieldName}" at level "${level}".`);
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

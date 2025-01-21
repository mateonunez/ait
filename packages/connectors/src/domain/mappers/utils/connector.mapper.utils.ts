import type { ConnectorLevels } from "../connector.mapper";

interface PassThroughLevelOptions<T> {
  fallback?: T;
  transform?: (value: T) => T;
}

interface PassThroughOptions<T> {
  external?: PassThroughLevelOptions<T>;
  domain?: PassThroughLevelOptions<T>;
  dataTarget?: PassThroughLevelOptions<T>;
}

export function connectorMapperPassThrough<T extends string, V>(
  fieldName: T,
  options: PassThroughOptions<V> = {},
): { [K in ConnectorLevels]: (entity: any) => V } {
  const levels: ConnectorLevels[] = ["external", "domain", "dataTarget"];

  const mapping = {} as { [K in ConnectorLevels]: (entity: any) => V };

  for (const level of levels) {
    const levelOpts = options[level] ?? {};
    mapping[level] = (entity: any) => {
      let value = entity[fieldName];
      if (value === undefined) {
        value = levelOpts.fallback as V;
      }
      if (typeof levelOpts.transform === "function") {
        value = levelOpts.transform(value);
      }
      return value;
    };
  }

  return mapping;
}

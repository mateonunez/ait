export interface IConnectorDataNormalizer<T, U> {
  normalize(data: T): U;
}

export type ConnectorDataNormalizerMapping<T, U> = {
  [K in keyof U]: keyof T | ((source: T) => U[K]);
};

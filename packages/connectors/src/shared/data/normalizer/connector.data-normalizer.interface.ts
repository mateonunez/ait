export interface IConnectorDataNormalizer<T, U> {
  normalize(data: T): U;
}

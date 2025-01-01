export interface IConnectorDataStore<T> {
  store(data: T): Promise<void>;
}

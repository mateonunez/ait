export interface IConnectorStore<T> {
  save(data: T): Promise<void>;
}

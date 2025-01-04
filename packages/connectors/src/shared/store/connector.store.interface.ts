export interface IConnectorStore {
  save(data: any): Promise<void>;
}

export interface IConnectorDataRetriever<T> {
  fetchData(endpoint: string, params?: Record<string, any>): Promise<T>;
}

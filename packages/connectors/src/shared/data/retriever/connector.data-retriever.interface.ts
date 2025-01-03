export interface IConnectorDatadataSource<T> {
  fetchData(endpoint: string, params?: Record<string, any>): Promise<T>;
}

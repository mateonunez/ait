export interface IConnectorService<T> {
  authenticate(code: string): Promise<void>;
  connector: T;
}

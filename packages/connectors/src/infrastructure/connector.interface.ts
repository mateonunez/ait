export interface IConnector<T, U, V, W> {
  connect(code: string): Promise<void>;
  authenticator: T;
  dataSource: U | undefined;
  normalizer: V;
  store: W;
}

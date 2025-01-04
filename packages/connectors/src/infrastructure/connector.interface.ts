export interface IConnector<T, U, W> {
  connect(code: string): Promise<void>;
  authenticator: T;
  dataSource: U | undefined;
  store: W;
}

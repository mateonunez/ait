import type { ConnectorServiceBase } from "@/services/connector.service.base.abstract";

export interface IConnector<T, U, W> {
  connect(code: string): Promise<void>;
  authenticator: T;
  dataSource: U | undefined;
  store: W;
}

export type ConnectorType = "github" | "spotify";

export type ConnectorServiceConstructor<T extends ConnectorServiceBase<any, any>> = new () => T;

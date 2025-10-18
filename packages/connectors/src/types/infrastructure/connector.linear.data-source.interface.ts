import type { LinearIssueExternal } from "../domain/entities/vendors/connector.linear.types";

export interface IConnectorLinearDataSource {
  fetchIssues(): Promise<LinearIssueExternal[]>;
}

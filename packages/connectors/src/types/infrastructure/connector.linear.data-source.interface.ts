import type { LinearIssueExternal } from "@ait/core";

export interface IConnectorLinearDataSource {
  fetchIssues(): Promise<LinearIssueExternal[]>;
}

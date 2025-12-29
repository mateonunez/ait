import type { LinearIssueEntity, PaginatedResponse, PaginationParams } from "@ait/core";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorLinearIssueRepository {
  saveIssue(issue: LinearIssueEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveIssues(issues: LinearIssueEntity[]): Promise<void>;
  getIssue(id: string): Promise<LinearIssueEntity | null>;
  fetchIssues(): Promise<LinearIssueEntity[]>;
  getIssuesPaginated(params: PaginationParams): Promise<PaginatedResponse<LinearIssueEntity>>;
}

export interface IConnectorLinearRepository extends IConnectorRepository {
  issue: IConnectorLinearIssueRepository;
}

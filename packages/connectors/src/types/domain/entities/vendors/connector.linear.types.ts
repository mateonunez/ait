import type {
  IConnectorRepository,
  IConnectorRepositorySaveOptions,
} from "@/types/domain/entities/connector.repository.interface";

export interface BaseLinearEntity {
  __type: "issue";
}

export interface LinearIssueExternal extends BaseLinearEntity {
  id: string;
  title: string;
  description?: string;
  state: { name: string };
  priority: number;
  assignee?: { id: string };
  team: { id: string };
  project?: { id: string };
  url: string;
  labels: { nodes: Array<{ name: string }> };
  createdAt: string;
  updatedAt: string;
  __type: "issue";
}

export interface LinearIssueEntity extends BaseLinearEntity {
  id: string;
  title: string;
  description: string | null;
  state: string;
  priority: number | null;
  assigneeId: string | null;
  teamId: string;
  projectId: string | null;
  url: string;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
  __type: "issue";
}

export interface IConnectorLinearIssueRepository {
  saveIssue(issue: LinearIssueEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveIssues(issues: LinearIssueEntity[]): Promise<void>;
  getIssue(id: string): Promise<LinearIssueEntity | null>;
  getIssues(): Promise<LinearIssueEntity[]>;
}

export interface IConnectorLinearRepository extends IConnectorRepository {
  issue: IConnectorLinearIssueRepository;
}

export type LinearEntity = LinearIssueEntity;
export type LinearExternal = LinearIssueExternal;

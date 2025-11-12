export interface BaseLinearEntity {
  __type: "issue";
}

export interface LinearIssueEntity extends BaseLinearEntity {
  id: string;
  title: string;
  description: string | null;
  state: string;
  priority: number | null;
  assigneeId: string | null;
  assigneeName: string | null;
  teamId: string;
  teamName: string | null;
  projectId: string | null;
  projectName: string | null;
  url: string;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
  __type: "issue";
}

export interface LinearIssueExternal extends BaseLinearEntity {
  id: string;
  title: string;
  description?: string;
  state: { name: string };
  priority: number;
  assignee?: { id: string; name: string };
  team: { id: string; name: string };
  project?: { id: string; name: string };
  url: string;
  labels: { nodes: Array<{ name: string }> };
  createdAt: string;
  updatedAt: string;
  __type: "issue";
}

export type LinearEntity = LinearIssueEntity;
export type LinearExternal = LinearIssueExternal;

import { z } from "zod";

export interface BaseLinearEntityType {
  __type: "linear_issue";
}

export interface LinearIssueExternal extends BaseLinearEntityType {
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
  __type: "linear_issue";
}

export const LinearIssueEntityTypeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.string(),
  priority: z.number().nullable(),
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  teamId: z.string(),
  teamName: z.string().nullable(),
  projectId: z.string().nullable(),
  projectName: z.string().nullable(),
  url: z.string(),
  labels: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
  __type: z.literal("linear_issue"),
});

export type LinearIssueEntityType = z.infer<typeof LinearIssueEntityTypeSchema>;

export type LinearEntityType = LinearIssueEntityType;
export type LinearExternal = LinearIssueExternal;

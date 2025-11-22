import { z } from "zod";

export interface BaseLinearEntity {
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

export const LinearIssueEntitySchema = z.object({
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
  __type: z.literal("issue"),
});

export type LinearIssueEntity = z.infer<typeof LinearIssueEntitySchema>;

export type LinearEntity = LinearIssueEntity;
export type LinearExternal = LinearIssueExternal;

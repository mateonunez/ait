import { z } from "zod";

export interface BaseNotionEntityType {
  __type: "notion_page";
}

export interface NotionPageExternal extends BaseNotionEntityType {
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: {
    object: string;
    id: string;
  };
  last_edited_by: {
    object: string;
    id: string;
  };
  cover: {
    type: string;
    external?: { url: string };
    file?: { url: string; expiry_time?: string };
  } | null;
  icon: {
    type: string;
    emoji?: string;
    external?: { url: string };
    file?: { url: string; expiry_time?: string };
  } | null;
  parent: {
    type: string;
    database_id?: string;
    page_id?: string;
    workspace?: boolean;
  };
  archived: boolean;
  properties: Record<string, unknown>;
  url: string;
  content: string | null;
  __type: "notion_page";
}
export const NotionPageEntityTypeSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  parentType: z.string().nullable(),
  parentId: z.string().nullable(),
  archived: z.boolean(),
  icon: z.string().nullable(),
  cover: z.string().nullable(),
  content: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().nullable(),
  lastEditedBy: z.string().nullable(),
  properties: z.record(z.string(), z.unknown()),
  __type: z.literal("notion_page"),
});

export type NotionPageEntityType = z.infer<typeof NotionPageEntityTypeSchema>;

export type NotionEntityType = NotionPageEntityType;
export type NotionExternal = NotionPageExternal;

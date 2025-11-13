export interface BaseNotionEntity {
  __type: "page";
}

export interface NotionPageEntity extends BaseNotionEntity {
  id: string;
  title: string;
  url: string;
  parentType: string | null;
  parentId: string | null;
  archived: boolean;
  icon: string | null;
  cover: string | null;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  lastEditedBy: string | null;
  properties: Record<string, unknown>;
  __type: "page";
}

export interface NotionPageExternal extends BaseNotionEntity {
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
  __type: "page";
}

export type NotionEntity = NotionPageEntity;
export type NotionExternal = NotionPageExternal;

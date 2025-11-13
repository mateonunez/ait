import type { NotionPageDataTarget } from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";
import type { ConnectorMapperDefinition } from "../../../types/domain/mappers/connector.mapper.interface";
import type { NotionPageEntity, NotionPageExternal } from "@ait/core";

function extractTitleFromProperties(properties: Record<string, unknown>): string {
  const titleProperty = properties.title;

  if (!titleProperty) {
    return "Untitled";
  }

  if (typeof titleProperty === "object" && titleProperty !== null) {
    const titleObj = titleProperty as Record<string, unknown>;

    if (titleObj.type === "title" && Array.isArray(titleObj.title)) {
      const richTextArray = titleObj.title as Array<{ plain_text?: string; text?: { content?: string } }>;
      return richTextArray.map((rt) => rt.plain_text || rt.text?.content || "").join("") || "Untitled";
    }

    if (titleObj.type === "rich_text" && Array.isArray(titleObj.rich_text)) {
      const richTextArray = titleObj.rich_text as Array<{ plain_text?: string; text?: { content?: string } }>;
      return richTextArray.map((rt) => rt.plain_text || rt.text?.content || "").join("") || "Untitled";
    }
  }

  return "Untitled";
}

function extractIconUrl(icon: NotionPageExternal["icon"]): string | null {
  if (!icon) return null;

  if (icon.type === "emoji" && icon.emoji) {
    return icon.emoji;
  }

  if (icon.type === "external" && icon.external?.url) {
    return icon.external.url;
  }

  if (icon.type === "file" && icon.file?.url) {
    return icon.file.url;
  }

  return null;
}

function extractCoverUrl(cover: NotionPageExternal["cover"]): string | null {
  if (!cover) return null;

  if (cover.type === "external" && cover.external?.url) {
    return cover.external.url;
  }

  if (cover.type === "file" && cover.file?.url) {
    return cover.file.url;
  }

  return null;
}

const notionPageMapping: ConnectorMapperDefinition<NotionPageExternal, NotionPageEntity, NotionPageDataTarget> = {
  id: connectorMapperPassThrough<"id", string, NotionPageExternal, NotionPageEntity, NotionPageDataTarget>("id"),

  title: {
    external: (external) => extractTitleFromProperties(external.properties),
    domain: (domain) => domain.title,
    dataTarget: (dataTarget) => dataTarget.title,
  },

  url: connectorMapperPassThrough<"url", string, NotionPageExternal, NotionPageEntity, NotionPageDataTarget>("url"),

  parentType: {
    external: (external) => external.parent?.type || null,
    domain: (domain) => domain.parentType,
    dataTarget: (dataTarget) => dataTarget.parentType ?? null,
  },

  parentId: {
    external: (external) => external.parent?.database_id || external.parent?.page_id || null,
    domain: (domain) => domain.parentId,
    dataTarget: (dataTarget) => dataTarget.parentId ?? null,
  },

  archived: connectorMapperPassThrough<"archived", boolean, NotionPageExternal, NotionPageEntity, NotionPageDataTarget>(
    "archived",
  ),

  icon: {
    external: (external) => extractIconUrl(external.icon),
    domain: (domain) => domain.icon,
    dataTarget: (dataTarget) => dataTarget.icon ?? null,
  },

  cover: {
    external: (external) => extractCoverUrl(external.cover),
    domain: (domain) => domain.cover,
    dataTarget: (dataTarget) => dataTarget.cover ?? null,
  },

  createdAt: {
    external: (external) => new Date(external.created_time),
    domain: (domain) => domain.createdAt,
    dataTarget: (dataTarget) => dataTarget.createdAt ?? new Date(),
  },

  updatedAt: {
    external: (external) => new Date(external.last_edited_time),
    domain: (domain) => domain.updatedAt,
    dataTarget: (dataTarget) => dataTarget.updatedAt ?? new Date(),
  },

  createdBy: {
    external: (external) => external.created_by?.id || null,
    domain: (domain) => domain.createdBy,
    dataTarget: (dataTarget) => dataTarget.createdBy ?? null,
  },

  lastEditedBy: {
    external: (external) => external.last_edited_by?.id || null,
    domain: (domain) => domain.lastEditedBy,
    dataTarget: (dataTarget) => dataTarget.lastEditedBy ?? null,
  },

  content: {
    external: (external) => external.content || null,
    domain: (domain) => domain.content,
    dataTarget: (dataTarget) => dataTarget.content ?? null,
  },

  __type: {
    external: () => "page" as const,
    domain: (domain) => domain.__type,
    dataTarget: () => "page" as const,
  },
};

const domainDefaults = { __type: "page" as const };

export const connectorNotionPageMapper = new ConnectorMapper<
  NotionPageExternal,
  NotionPageEntity,
  NotionPageDataTarget
>(notionPageMapping, domainDefaults);

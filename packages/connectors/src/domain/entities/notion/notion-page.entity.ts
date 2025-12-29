import "reflect-metadata";
import type { NotionPageExternal } from "@ait/core";
import type { NotionPageDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * Notion Page entity with class-transformer decorators.
 */
export class NotionPageEntity {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  url!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  parentType!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  parentId!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? false)
  archived!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? null)
  icon!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  cover!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  content!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? {})
  properties!: Record<string, unknown>;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  @Transform(({ value }) => value ?? null)
  createdBy!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  lastEditedBy!: string | null;

  @Expose()
  readonly __type = "page" as const;
}

/**
 * Transform external Notion API response to domain entity.
 */
export function mapNotionPage(external: NotionPageExternal): NotionPageEntity {
  const getTitle = (properties: any) => {
    const titleProp = Object.values(properties).find((p: any) => p.type === "title") as any;
    return titleProp?.title?.[0]?.plain_text ?? "Untitled";
  };

  const getIcon = (icon: any) => {
    if (!icon) return null;
    if (icon.type === "emoji") return icon.emoji;
    if (icon.type === "external") return icon.external?.url;
    if (icon.type === "file") return icon.file?.url;
    return null;
  };

  const getCover = (cover: any) => {
    if (!cover) return null;
    if (cover.type === "external") return cover.external?.url;
    if (cover.type === "file") return cover.file?.url;
    return null;
  };

  const mapped = {
    ...external,
    title: getTitle(external.properties),
    parentType: external.parent?.type ?? null,
    parentId: external.parent?.database_id ?? external.parent?.page_id ?? null,
    icon: getIcon(external.icon),
    cover: getCover(external.cover),
    createdAt: external.created_time,
    updatedAt: external.last_edited_time,
    createdBy: external.created_by?.id ?? null,
    lastEditedBy: external.last_edited_by?.id ?? null,
  };

  return plainToInstance(NotionPageEntity, mapped, {
    excludeExtraneousValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapNotionPages(externals: NotionPageExternal[]): NotionPageEntity[] {
  return externals.map(mapNotionPage);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function notionPageDomainToDataTarget(domain: NotionPageEntity): NotionPageDataTarget {
  return instanceToPlain(domain) as NotionPageDataTarget;
}

export function notionPageDataTargetToDomain(dataTarget: NotionPageDataTarget): NotionPageEntity {
  return plainToInstance(NotionPageEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}

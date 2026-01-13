import { randomUUID } from "node:crypto";
import {
  AItError,
  NotionPageEntity,
  type PaginatedResponse,
  type PaginationParams,
  buildPaginatedResponse,
  getLogger,
  getPaginationOffset,
} from "@ait/core";
import { type NotionPageDataTarget, drizzleOrm, getPostgresClient, notionPages } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorNotionPageRepository } from "../../../../types/domain/entities/vendors/connector.notion.types";

const logger = getLogger();

export class ConnectorNotionPageRepository implements IConnectorNotionPageRepository {
  private _pgClient = getPostgresClient();

  async savePage(
    page: NotionPageEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const pageId = incremental ? randomUUID() : page.id;

    try {
      const pageDataTarget = page.toPlain<NotionPageDataTarget>();
      pageDataTarget.id = pageId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<NotionPageDataTarget> = {
          title: pageDataTarget.title,
          url: pageDataTarget.url,
          parentType: pageDataTarget.parentType,
          parentId: pageDataTarget.parentId,
          archived: pageDataTarget.archived,
          icon: pageDataTarget.icon,
          cover: pageDataTarget.cover,
          content: pageDataTarget.content,
          createdBy: pageDataTarget.createdBy,
          lastEditedBy: pageDataTarget.lastEditedBy,
          properties: pageDataTarget.properties as any,
          updatedAt: new Date(),
        };

        await tx
          .insert(notionPages)
          .values(pageDataTarget as any)
          .onConflictDoUpdate({
            target: notionPages.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to save page:", { pageId, error: message });
      throw new AItError("NOTION_SAVE_PAGE", `Failed to save page ${pageId}: ${message}`, { id: pageId }, error);
    }
  }

  async savePages(pages: NotionPageEntity[]): Promise<void> {
    if (!pages.length) {
      return;
    }

    try {
      for (const page of pages) {
        await this.savePage(page, { incremental: true });
      }
    } catch (error) {
      logger.error("Error saving pages:", { error });
      throw new AItError("NOTION_SAVE_PAGE_BULK", "Failed to save pages to repository");
    }
  }

  async getPage(id: string): Promise<NotionPageEntity | null> {
    const result = await this._pgClient.db.select().from(notionPages).where(drizzleOrm.eq(notionPages.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return NotionPageEntity.fromPlain(result[0]! as NotionPageDataTarget);
  }

  async fetchPages(): Promise<NotionPageEntity[]> {
    const results = await this._pgClient.db.select().from(notionPages);
    return results.map((result) => NotionPageEntity.fromPlain(result as NotionPageDataTarget));
  }

  async getPagesPaginated(params: PaginationParams): Promise<PaginatedResponse<NotionPageEntity>> {
    const { limit, offset } = getPaginationOffset(params);

    const [pages, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(notionPages)
        .orderBy(drizzleOrm.desc(notionPages.updatedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(notionPages),
    ]);

    return buildPaginatedResponse(
      pages.map((page) => NotionPageEntity.fromPlain(page as NotionPageDataTarget)),
      params,
      totalResult[0]?.count || 0,
    );
  }
}

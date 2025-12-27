import { randomUUID } from "node:crypto";
import { AItError, type PaginatedResponse, type PaginationParams, getLogger } from "@ait/core";
import { type NotionPageDataTarget, drizzleOrm, getPostgresClient, notionPages } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorNotionPageRepository } from "../../../../types/domain/entities/vendors/connector.notion.types";
import { notionPageDataTargetToDomain, notionPageDomainToDataTarget } from "../../notion/notion-page.entity";
import type { NotionPageEntity } from "../../notion/notion-page.entity";

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
      const pageDataTarget = notionPageDomainToDataTarget(page);
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
    } catch (error: any) {
      logger.error("Failed to save page:", { pageId, error });
      throw new AItError("NOTION_SAVE_PAGE", `Failed to save page ${pageId}: ${error.message}`, { id: pageId }, error);
    }
  }

  async savePages(pages: NotionPageEntity[]): Promise<void> {
    if (!pages.length) {
      return;
    }

    try {
      logger.debug("Saving pages to Notion repository:", { pages });

      for (const page of pages) {
        await this.savePage(page, { incremental: true });
      }
    } catch (error) {
      logger.error("Error saving pages:", { error });
      throw new AItError("NOTION_SAVE_PAGE_BULK", "Failed to save pages to repository");
    }
  }

  async getPage(id: string): Promise<NotionPageEntity | null> {
    logger.info("Getting page from Notion repository", { id });
    return null;
  }

  async fetchPages(): Promise<NotionPageEntity[]> {
    logger.info("Getting pages from Notion repository");
    return [];
  }

  async getPagesPaginated(params: PaginationParams): Promise<PaginatedResponse<NotionPageEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [pages, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(notionPages)
        .orderBy(drizzleOrm.desc(notionPages.updatedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(notionPages),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: pages.map((page) => notionPageDataTargetToDomain(page as NotionPageDataTarget)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}

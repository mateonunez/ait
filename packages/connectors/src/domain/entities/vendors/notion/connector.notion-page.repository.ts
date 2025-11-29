import { AItError, type NotionPageEntity, type PaginatedResponse, type PaginationParams } from "@ait/core";
import { connectorNotionPageMapper } from "../../../../domain/mappers/vendors/connector.notion.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorNotionPageRepository } from "../../../../types/domain/entities/vendors/connector.notion.types";
import { getPostgresClient, notionPages, type NotionPageDataTarget, drizzleOrm } from "@ait/postgres";
import { randomUUID } from "node:crypto";
import { getLogger } from "@ait/core";

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
      const pageDataTarget = connectorNotionPageMapper.domainToDataTarget(page);
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
          updatedAt: new Date(),
        };

        await tx
          .insert(notionPages)
          .values(pageDataTarget)
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
      data: pages.map((page) => connectorNotionPageMapper.dataTargetToDomain(page)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}

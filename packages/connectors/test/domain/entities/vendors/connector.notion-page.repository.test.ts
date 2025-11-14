import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPostgresClient, closePostgresConnection, drizzleOrm, notionPages } from "@ait/postgres";
import { ConnectorNotionPageRepository } from "../../../../src/domain/entities/vendors/notion/connector.notion-page.repository";
import type { NotionPageEntity } from "@ait/core";

describe("ConnectorNotionPageRepository", () => {
  const repository = new ConnectorNotionPageRepository();
  const { db } = getPostgresClient();

  after(async () => {
    await closePostgresConnection();
  });

  describe("ConnectorNotionPageRepository", () => {
    beforeEach(async () => {
      await db.delete(notionPages).execute();
    });

    describe("savePage", () => {
      it("should save page successfully", async () => {
        const now = new Date();
        const page: NotionPageEntity = {
          id: "test-page-1",
          title: "Test Page",
          url: "https://notion.so/test-page-1",
          parentType: "workspace",
          parentId: null,
          archived: false,
          icon: null,
          cover: null,
          content: "Test content",
          createdAt: now,
          updatedAt: now,
          createdBy: "user-1",
          lastEditedBy: "user-2",
          properties: {},
          __type: "page",
        } as unknown as NotionPageEntity;

        await repository.savePage(page);

        const saved = await db.select().from(notionPages).where(drizzleOrm.eq(notionPages.id, page.id)).execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].id, page.id);
        assert.equal(saved[0].title, page.title);
        assert.equal(saved[0].url, page.url);
      });

      it("should update existing page on conflict", async () => {
        const now = new Date();
        const page: NotionPageEntity = {
          id: "test-page-update",
          title: "Original Title",
          url: "https://notion.so/test-page-update",
          parentType: "workspace",
          parentId: null,
          archived: false,
          icon: null,
          cover: null,
          content: "Original content",
          createdAt: now,
          updatedAt: now,
          createdBy: "user-1",
          lastEditedBy: "user-2",
          properties: {},
          __type: "page",
        } as unknown as NotionPageEntity;

        await repository.savePage(page);

        // Update the page
        const updatedPage: NotionPageEntity = {
          ...page,
          title: "Updated Title",
          content: "Updated content",
          updatedAt: new Date(),
        } as unknown as NotionPageEntity;

        await repository.savePage(updatedPage);

        const saved = await db.select().from(notionPages).where(drizzleOrm.eq(notionPages.id, page.id)).execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].title, "Updated Title");
        assert.equal(saved[0].content, "Updated content");
      });

      it("should throw on missing page ID", async () => {
        const page = {} as NotionPageEntity;

        await assert.rejects(() => repository.savePage(page), {
          message: /Failed to save/,
        });
      });
    });

    describe("savePages", () => {
      it("should save multiple pages", async () => {
        const now = new Date();
        const pages: NotionPageEntity[] = [
          {
            id: "page-1",
            title: "Page 1",
            url: "https://notion.so/page-1",
            parentType: "workspace",
            parentId: null,
            archived: false,
            icon: null,
            cover: null,
            content: "Content 1",
            createdAt: now,
            updatedAt: now,
            createdBy: "user-1",
            lastEditedBy: "user-2",
            properties: {},
            __type: "page",
          },
          {
            id: "page-2",
            title: "Page 2",
            url: "https://notion.so/page-2",
            parentType: "database",
            parentId: "db-1",
            archived: false,
            icon: { type: "emoji", emoji: "📄" },
            cover: null,
            content: "Content 2",
            createdAt: now,
            updatedAt: now,
            createdBy: "user-1",
            lastEditedBy: "user-2",
            properties: {},
            __type: "page",
          },
        ] as NotionPageEntity[];

        await repository.savePages(pages);

        const saved = await db.select().from(notionPages).execute();
        assert.equal(saved.length, 2, "Expected two pages to be saved");
      });

      it("should do nothing if empty array is provided", async () => {
        await repository.savePages([]);
        const saved = await db.select().from(notionPages).execute();
        assert.equal(saved.length, 0, "No pages should be saved for empty input");
      });
    });

    describe("getPagesPaginated", () => {
      it("should return paginated pages", async () => {
        const now = new Date();
        const pages: NotionPageEntity[] = Array.from({ length: 15 }, (_, i) => ({
          id: `page-${i + 1}`,
          title: `Page ${i + 1}`,
          url: `https://notion.so/page-${i + 1}`,
          parentType: "workspace",
          parentId: null,
          archived: false,
          icon: null,
          cover: null,
          content: `Content ${i + 1}`,
          createdAt: new Date(now.getTime() + i * 1000),
          updatedAt: new Date(now.getTime() + i * 1000),
          createdBy: "user-1",
          lastEditedBy: "user-2",
          properties: {},
          __type: "page",
        })) as NotionPageEntity[];

        await repository.savePages(pages);

        const result = await repository.getPagesPaginated({ page: 1, limit: 5 });
        assert.equal(result.data.length, 5);
        assert.equal(result.pagination.page, 1);
        assert.equal(result.pagination.limit, 5);
        assert.equal(result.pagination.total, 15);
        assert.equal(result.pagination.totalPages, 3);
      });

      it("should return correct page for second page", async () => {
        const now = new Date();
        const pages: NotionPageEntity[] = Array.from({ length: 10 }, (_, i) => ({
          id: `page-${i + 1}`,
          title: `Page ${i + 1}`,
          url: `https://notion.so/page-${i + 1}`,
          parentType: "workspace",
          parentId: null,
          archived: false,
          icon: null,
          cover: null,
          content: `Content ${i + 1}`,
          createdAt: new Date(now.getTime() + i * 1000),
          updatedAt: new Date(now.getTime() + i * 1000),
          createdBy: "user-1",
          lastEditedBy: "user-2",
          properties: {},
          __type: "page",
        })) as NotionPageEntity[];

        await repository.savePages(pages);

        const result = await repository.getPagesPaginated({ page: 2, limit: 3 });
        assert.equal(result.data.length, 3);
        assert.equal(result.pagination.page, 2);
        assert.equal(result.pagination.limit, 3);
        assert.equal(result.pagination.total, 10);
        assert.equal(result.pagination.totalPages, 4);
      });

      it("should return empty array when no pages exist", async () => {
        const result = await repository.getPagesPaginated({ page: 1, limit: 10 });
        assert.equal(result.data.length, 0);
        assert.equal(result.pagination.total, 0);
        assert.equal(result.pagination.totalPages, 0);
      });
    });
  });
});

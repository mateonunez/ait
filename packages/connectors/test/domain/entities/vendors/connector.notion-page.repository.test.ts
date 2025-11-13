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
  });
});

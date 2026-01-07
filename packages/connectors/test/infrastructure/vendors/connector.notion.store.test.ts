import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { NotionPageEntity } from "@ait/core";
import { ConnectorNotionStore } from "../../../src/infrastructure/vendors/notion/connector.notion.store";
import type { IConnectorNotionRepository } from "../../../src/types/domain/entities/vendors/connector.notion.types";

describe("ConnectorNotionStore", () => {
  let mockRepository: IConnectorNotionRepository;
  let store: ConnectorNotionStore;

  beforeEach(() => {
    mockRepository = {
      page: {
        savePage: async (_page: NotionPageEntity) => {},
      },
    } as unknown as IConnectorNotionRepository;

    store = new ConnectorNotionStore(mockRepository);
  });

  describe("save", () => {
    it("should call savePage for a single page item", async () => {
      let savePageCalledWith: NotionPageEntity;

      mockRepository.page.savePage = async (page: NotionPageEntity) => {
        savePageCalledWith = page;
      };

      const page: NotionPageEntity = {
        id: "page-1",
        title: "Test Page",
        url: "https://notion.so/page-1",
        parentType: "workspace",
        parentId: null,
        archived: false,
        icon: null,
        cover: null,
        content: "Test content",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user-1",
        lastEditedBy: "user-2",
        properties: {},
        __type: "notion_page",
      } as unknown as NotionPageEntity;

      await store.save(page);

      // @ts-expect-error - It's intercepted by the mock
      assert.ok(savePageCalledWith, "Expected savePage to be called");
      assert.equal(savePageCalledWith, page);
    });

    it("should call savePage for multiple page items", async () => {
      const notionPages: NotionPageEntity[] = [];
      mockRepository.page.savePage = async (page: NotionPageEntity) => {
        notionPages.push(page);
      };

      const pages: NotionPageEntity[] = [
        {
          id: "page-1",
          title: "Page One",
          url: "https://notion.so/page-1",
          parentType: "workspace",
          parentId: null,
          archived: false,
          icon: null,
          cover: null,
          content: "Content 1",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: "user-1",
          lastEditedBy: "user-2",
          properties: {},
          __type: "notion_page",
        } as unknown as NotionPageEntity,
        {
          id: "page-2",
          title: "Page Two",
          url: "https://notion.so/page-2",
          parentType: "workspace",
          parentId: null,
          archived: false,
          icon: null,
          cover: null,
          content: "Content 2",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: "user-1",
          lastEditedBy: "user-2",
          properties: {},
          __type: "notion_page",
        } as unknown as NotionPageEntity,
      ];

      await store.save(pages);

      assert.equal(notionPages.length, 2, "Expected savePage to be called twice");
      assert.equal(notionPages[0], pages[0]);
      assert.equal(notionPages[1], pages[1]);
    });

    it("should throw an error if the item type is not supported", async () => {
      const unsupportedItem = {
        id: "unsupported-1",
        name: "Some Entity",
        __type: "unsupported" as "notion_page", // this generates a type error
      } as unknown as any;

      await assert.rejects(async () => {
        await store.save(unsupportedItem);
      }, /Type unsupported is not supported/);
    });
  });

  describe("saveAuthenticationData", () => {
    it("should call repository saveAuthenticationData", async () => {
      let saveAuthCalled = false;
      mockRepository.saveAuthenticationData = async () => {
        saveAuthCalled = true;
      };

      await store.saveAuthenticationData({
        access_token: "test-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "test-refresh",
        scope: "read",
      });

      assert.ok(saveAuthCalled, "Expected saveAuthenticationData to be called");
    });
  });

  describe("getAuthenticationData", () => {
    it("should call repository getAuthenticationData", async () => {
      const mockAuthData = {
        access_token: "test-token",
        token_type: "Bearer",
        expires_in: 3600,
      };

      mockRepository.getAuthenticationData = async () => mockAuthData as any;

      const result = await store.getAuthenticationData();

      assert.equal(result, mockAuthData);
    });
  });
});

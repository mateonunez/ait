import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";
import { CollectionDiscoveryService } from "../../../src/services/metadata/collection-discovery.service";
import type { CollectionWeight } from "../../../src/types/collections";

describe("CollectionDiscoveryService", () => {
  let service: CollectionDiscoveryService;
  let mockClient: any;
  let mockClientFactory: sinon.SinonStub;

  beforeEach(() => {
    mockClient = {
      getCollections: sinon.stub(),
    };
    mockClientFactory = sinon.stub().resolves(mockClient);
    service = new CollectionDiscoveryService(mockClientFactory);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("getExistingCollectionNames", () => {
    it("should fetch collections from client and cache them", async () => {
      mockClient.getCollections.resolves({
        collections: [{ name: "collection1" }, { name: "collection2" }],
      });

      const names = await service.getExistingCollectionNames();

      assert.equal(names.size, 2);
      assert.ok(names.has("collection1"));
      assert.ok(names.has("collection2"));
      assert.ok(mockClient.getCollections.calledOnce);

      // Second call should use cache
      const cachedNames = await service.getExistingCollectionNames();
      assert.equal(cachedNames.size, 2);
      assert.ok(mockClient.getCollections.calledOnce);
    });

    it("should handle errors gracefully and return empty set", async () => {
      mockClient.getCollections.rejects(new Error("Qdrant error"));

      const names = await service.getExistingCollectionNames();

      assert.equal(names.size, 0);
    });

    it("should refresh cache after TTL", async () => {
      const clock = sinon.useFakeTimers();
      mockClient.getCollections.resolves({
        collections: [{ name: "collection1" }],
      });

      await service.getExistingCollectionNames();
      assert.ok(mockClient.getCollections.calledOnce);

      // Advance time past TTL (60s)
      clock.tick(60001);

      await service.getExistingCollectionNames();
      assert.ok(mockClient.getCollections.calledTwice);

      clock.restore();
    });
  });

  describe("filterExistingCollections", () => {
    it("should filter out non-existent collections", async () => {
      mockClient.getCollections.resolves({
        collections: [{ name: "ait_spotify_collection" }],
      });

      const collections: CollectionWeight[] = [
        { vendor: "spotify", weight: 1.0 },
        { vendor: "github", weight: 0.5 },
      ];

      const filtered = await service.filterExistingCollections(collections);

      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].vendor, "spotify");
    });
  });

  describe("getAllExistingCollections", () => {
    it("should return all collections that exist in Qdrant", async () => {
      mockClient.getCollections.resolves({
        collections: [{ name: "ait_spotify_collection" }, { name: "ait_github_collection" }],
      });

      const all = await service.getAllExistingCollections();

      const vendors = all.map((c) => c.vendor);
      assert.ok(vendors.includes("spotify"));
      assert.ok(vendors.includes("github"));
      assert.ok(all.length >= 2);
    });
  });

  describe("invalidateCache", () => {
    it("should clear the cache", async () => {
      mockClient.getCollections.resolves({
        collections: [{ name: "collection1" }],
      });

      await service.getExistingCollectionNames();
      assert.ok(mockClient.getCollections.calledOnce);

      service.invalidateCache();

      await service.getExistingCollectionNames();
      assert.ok(mockClient.getCollections.calledTwice);
    });
  });
});

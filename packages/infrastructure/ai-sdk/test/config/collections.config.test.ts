import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type EntityType, VALID_ENTITY_TYPES } from "@ait/core";
import {
  type CollectionVendor,
  getAllCollections,
  getCollectionByEntityType,
  getCollectionConfig,
  getCollectionNameByEntityType,
  getCollectionNameByVendor,
  getCollectionVendorByName,
  getCollectionsByEntityTypes,
  getCollectionsNames,
  isValidCollectionVendor,
} from "../../src/config/collections.config";

describe("Collections Configuration", () => {
  describe("getCollectionConfig", () => {
    it("should return config for valid vendor", () => {
      const config = getCollectionConfig("spotify");

      assert.ok(config);
      assert.equal(config.vendor, "spotify");
      assert.equal(config.name, "ait_spotify_collection");
      assert.ok(config.entityTypes.length > 0);
    });

    it("should throw for invalid vendor", () => {
      assert.throws(() => getCollectionConfig("invalid" as CollectionVendor), {
        message: /Collection configuration not found/,
      });
    });

    it("should return collections for all vendors", () => {
      const vendors: CollectionVendor[] = ["spotify", "github", "linear", "x", "notion", "general"];

      for (const vendor of vendors) {
        const config = getCollectionConfig(vendor);
        assert.ok(config);
        assert.equal(config.vendor, vendor);
      }
    });
  });

  describe("getAllCollections", () => {
    it("should return all enabled collections", () => {
      const collections = getAllCollections();

      assert.ok(collections.length > 0);
      assert.ok(collections.every((c) => c.enabled));
    });

    it("should return collections with required fields", () => {
      const collections = getAllCollections();

      for (const collection of collections) {
        assert.ok(collection.vendor);
        assert.ok(collection.name);
        assert.ok(collection.description);
        assert.ok(Array.isArray(collection.entityTypes));
        assert.ok(typeof collection.defaultWeight === "number");
        assert.ok(typeof collection.enabled === "boolean");
      }
    });

    it("should include Spotify collection", () => {
      const collections = getAllCollections();
      const spotify = collections.find((c) => c.vendor === "spotify");

      assert.ok(spotify);
      assert.equal(spotify.name, "ait_spotify_collection");
    });

    it("should include GitHub collection", () => {
      const collections = getAllCollections();
      const github = collections.find((c) => c.vendor === "github");

      assert.ok(github);
      assert.equal(github.name, "ait_github_collection");
    });

    it("should include Linear collection", () => {
      const collections = getAllCollections();
      const linear = collections.find((c) => c.vendor === "linear");

      assert.ok(linear);
      assert.equal(linear.name, "ait_linear_collection");
    });
  });

  describe("getCollectionsNames", () => {
    it("should return array of collection names", () => {
      const names = getCollectionsNames();

      assert.ok(Array.isArray(names));
      assert.ok(names.length > 0);
      assert.ok(names.every((n) => typeof n === "string"));
    });

    it("should include expected collection names", () => {
      const names = getCollectionsNames();

      assert.ok(names.includes("ait_spotify_collection"));
      assert.ok(names.includes("ait_github_collection"));
      assert.ok(names.includes("ait_linear_collection"));
    });
  });

  describe("getCollectionByEntityType", () => {
    it("should return collection for track entity", () => {
      const collection = getCollectionByEntityType("spotify_track");

      assert.ok(collection);
      assert.equal(collection.vendor, "spotify");
      assert.ok(collection.entityTypes.includes("spotify_track"));
    });

    it("should return collection for pull_request entity", () => {
      const collection = getCollectionByEntityType("github_pull_request");

      assert.ok(collection);
      assert.equal(collection.vendor, "github");
      assert.ok(collection.entityTypes.includes("github_pull_request"));
    });

    it("should return collection for issue entity", () => {
      const collection = getCollectionByEntityType("linear_issue");

      assert.ok(collection);
      assert.equal(collection.vendor, "linear");
      assert.ok(collection.entityTypes.includes("linear_issue"));
    });

    it("should return collection for tweet entity", () => {
      const collection = getCollectionByEntityType("x_tweet");

      assert.ok(collection);
      assert.equal(collection.vendor, "x");
      assert.ok(collection.entityTypes.includes("x_tweet"));
    });

    it("should return undefined for unknown entity type", () => {
      const collection = getCollectionByEntityType("unknown" as EntityType);

      assert.equal(collection, undefined);
    });
  });

  describe("getCollectionsByEntityTypes", () => {
    it("should return collections for multiple entity types", () => {
      const collections = getCollectionsByEntityTypes(["spotify_track", "github_pull_request"]);

      assert.equal(collections.length, 2);
      assert.ok(collections.some((c) => c.vendor === "spotify"));
      assert.ok(collections.some((c) => c.vendor === "github"));
    });

    it("should deduplicate collections for same vendor", () => {
      const collections = getCollectionsByEntityTypes(["spotify_track", "spotify_artist", "spotify_playlist"]);

      // All three are in Spotify collection
      assert.equal(collections.length, 1);
      assert.equal(collections[0].vendor, "spotify");
    });

    it("should return empty array for unknown entity types", () => {
      const collections = getCollectionsByEntityTypes(["unknown" as EntityType]);

      assert.equal(collections.length, 0);
    });

    it("should handle mix of valid and invalid entity types", () => {
      const collections = getCollectionsByEntityTypes([
        "spotify_track",
        "unknown" as EntityType,
        "github_pull_request",
      ]);

      assert.equal(collections.length, 2);
      assert.ok(collections.some((c) => c.vendor === "spotify"));
      assert.ok(collections.some((c) => c.vendor === "github"));
    });

    it("should return empty array for empty input", () => {
      const collections = getCollectionsByEntityTypes([]);

      assert.equal(collections.length, 0);
    });
  });

  describe("isValidCollectionVendor", () => {
    it("should return true for valid vendors", () => {
      const validVendors = ["spotify", "github", "linear", "x", "notion", "general"];

      for (const vendor of validVendors) {
        assert.ok(isValidCollectionVendor(vendor));
      }
    });

    it("should return false for invalid vendors", () => {
      const invalidVendors = ["invalid", "notavendor", "xyz", ""];

      for (const vendor of invalidVendors) {
        assert.ok(!isValidCollectionVendor(vendor));
      }
    });
  });

  describe("getCollectionNameByVendor", () => {
    it("should return collection name for vendor", () => {
      const name = getCollectionNameByVendor("spotify");

      assert.equal(name, "ait_spotify_collection");
    });

    it("should work for all vendors", () => {
      const vendors: CollectionVendor[] = ["spotify", "github", "linear", "x", "notion", "general"];

      for (const vendor of vendors) {
        const name = getCollectionNameByVendor(vendor);
        assert.ok(name);
        assert.ok(name.startsWith("ait_"));
        assert.ok(name.includes("collection"));
      }
    });

    it("should throw for invalid vendor", () => {
      assert.throws(() => getCollectionNameByVendor("invalid" as CollectionVendor), {
        message: /Collection configuration not found/,
      });
    });
  });

  describe("getCollectionNameByEntityType", () => {
    it("should return collection name for track entity", () => {
      const name = getCollectionNameByEntityType("spotify_track");

      assert.equal(name, "ait_spotify_collection");
    });

    it("should return collection name for pull_request entity", () => {
      const name = getCollectionNameByEntityType("github_pull_request");

      assert.equal(name, "ait_github_collection");
    });

    it("should return collection name for issue entity", () => {
      const name = getCollectionNameByEntityType("linear_issue");

      assert.equal(name, "ait_linear_collection");
    });

    it("should throw for unknown entity type", () => {
      assert.throws(() => getCollectionNameByEntityType("unknown" as EntityType), {
        message: /Collection not found for entity type/,
      });
    });
  });

  describe("getCollectionVendorByName", () => {
    it("should return vendor for collection name", () => {
      const vendor = getCollectionVendorByName("ait_spotify_collection");

      assert.equal(vendor, "spotify");
    });

    it("should work for all collection names", () => {
      const names = getCollectionsNames();

      for (const name of names) {
        const vendor = getCollectionVendorByName(name);
        assert.ok(vendor);
        assert.ok(isValidCollectionVendor(vendor));
      }
    });

    it("should return undefined for unknown collection name", () => {
      const vendor = getCollectionVendorByName("unknown_collection");

      assert.equal(vendor, undefined);
    });
  });

  describe("VALID_ENTITY_TYPES", () => {
    it("should be a readonly array", () => {
      assert.ok(Array.isArray(VALID_ENTITY_TYPES));
    });

    it("should contain expected entity types", () => {
      const expectedTypes: EntityType[] = [
        "spotify_track",
        "spotify_artist",
        "spotify_playlist",
        "spotify_album",
        "spotify_recently_played",
        "github_repository",
        "github_pull_request",
        "x_tweet",
        "linear_issue",
        "notion_page",
      ];

      for (const type of expectedTypes) {
        assert.ok(VALID_ENTITY_TYPES.includes(type));
      }
    });

    it("should have unique values", () => {
      const uniqueTypes = new Set(VALID_ENTITY_TYPES);
      assert.equal(uniqueTypes.size, VALID_ENTITY_TYPES.length);
    });

    it("should not be empty", () => {
      assert.ok(VALID_ENTITY_TYPES.length > 0);
    });
  });

  describe("Collection Entity Types Mapping", () => {
    it("should map Spotify entity types correctly", () => {
      const spotifyTypes: EntityType[] = [
        "spotify_track",
        "spotify_artist",
        "spotify_playlist",
        "spotify_album",
        "spotify_recently_played",
      ];

      for (const type of spotifyTypes) {
        const collection = getCollectionByEntityType(type);
        assert.ok(collection);
        assert.equal(collection.vendor, "spotify");
      }
    });

    it("should map GitHub entity types correctly", () => {
      const githubTypes: EntityType[] = ["github_repository", "github_pull_request"];

      for (const type of githubTypes) {
        const collection = getCollectionByEntityType(type);
        assert.ok(collection);
        assert.equal(collection.vendor, "github");
      }
    });

    it("should map Linear entity types correctly", () => {
      const linearTypes: EntityType[] = ["linear_issue"];

      for (const type of linearTypes) {
        const collection = getCollectionByEntityType(type);
        assert.ok(collection);
        assert.equal(collection.vendor, "linear");
      }
    });

    it("should map X entity types correctly", () => {
      const xTypes: EntityType[] = ["x_tweet"];

      for (const type of xTypes) {
        const collection = getCollectionByEntityType(type);
        assert.ok(collection);
        assert.equal(collection.vendor, "x");
      }
    });

    it("should map Notion entity types correctly", () => {
      const notionTypes: EntityType[] = ["notion_page"];

      for (const type of notionTypes) {
        const collection = getCollectionByEntityType(type);
        assert.ok(collection);
        assert.equal(collection.vendor, "notion");
      }
    });
  });

  describe("Collection Weights", () => {
    it("should have positive default weights", () => {
      const collections = getAllCollections();

      for (const collection of collections) {
        assert.ok(collection.defaultWeight > 0);
      }
    });

    it("should have weights between 0 and 1 (inclusive)", () => {
      const collections = getAllCollections();

      for (const collection of collections) {
        assert.ok(collection.defaultWeight >= 0 && collection.defaultWeight <= 1);
      }
    });
  });
});

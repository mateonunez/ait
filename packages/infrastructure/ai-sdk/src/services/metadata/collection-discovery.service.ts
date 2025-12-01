import { getLogger } from "@ait/core";
import { type CollectionVendor, getAllCollections, getCollectionConfig } from "../../config/collections.config";
import type { CollectionWeight } from "../../types/collections";

const logger = getLogger();

export interface ICollectionDiscoveryService {
  getExistingCollectionNames(): Promise<Set<string>>;
  getExistingCollectionVendors(): Promise<Set<CollectionVendor>>;
  filterExistingCollections(collections: CollectionWeight[]): Promise<CollectionWeight[]>;
  getAllExistingCollections(): Promise<CollectionWeight[]>;
  invalidateCache(): void;
}

export class CollectionDiscoveryService implements ICollectionDiscoveryService {
  private _existingCollectionsCache: Set<string> | null = null;
  private _cacheTimestamp = 0;
  private readonly _cacheTTL: number = 60000; // 1 minute cache
  private readonly _clientFactory: () => Promise<any>;

  constructor(clientFactory?: () => Promise<any>) {
    this._clientFactory =
      clientFactory ||
      (async () => {
        const { getQdrantClient } = await import("@ait/qdrant");
        return getQdrantClient();
      });
  }

  async getExistingCollectionNames(): Promise<Set<string>> {
    const now = Date.now();
    if (this._existingCollectionsCache && now - this._cacheTimestamp < this._cacheTTL) {
      return this._existingCollectionsCache;
    }

    try {
      const client = await this._clientFactory();
      const collections = await client.getCollections();
      const existingNames = new Set(collections.collections.map((c: { name: string }) => c.name));

      this._existingCollectionsCache = existingNames as Set<string>;
      this._cacheTimestamp = now;

      return existingNames as Set<string>;
    } catch (error) {
      logger.warn("Failed to fetch existing collections from Qdrant", {
        error: error instanceof Error ? error.message : String(error),
      });
      return new Set();
    }
  }

  async getExistingCollectionVendors(): Promise<Set<CollectionVendor>> {
    const existingNames = await this.getExistingCollectionNames();
    const allCollections = getAllCollections();
    const existingVendors = new Set<CollectionVendor>();

    for (const collection of allCollections) {
      if (existingNames.has(collection.name)) {
        existingVendors.add(collection.vendor);
      }
    }

    return existingVendors;
  }

  async filterExistingCollections(collections: CollectionWeight[]): Promise<CollectionWeight[]> {
    const existingNames = await this.getExistingCollectionNames();
    const filtered: CollectionWeight[] = [];
    const filteredOut: CollectionVendor[] = [];

    for (const collection of collections) {
      const collectionConfig = getCollectionConfig(collection.vendor);
      if (existingNames.has(collectionConfig.name)) {
        filtered.push(collection);
      } else {
        filteredOut.push(collection.vendor);
      }
    }

    if (filteredOut.length > 0) {
      logger.warn("Filtered out non-existent collections", {
        filteredOut,
        remaining: filtered.map((c) => c.vendor),
      });
    }

    return filtered;
  }

  async getAllExistingCollections(): Promise<CollectionWeight[]> {
    const existingNames = await this.getExistingCollectionNames();
    const allCollections = getAllCollections();
    const existing: CollectionWeight[] = [];

    for (const collection of allCollections) {
      if (existingNames.has(collection.name)) {
        existing.push({
          vendor: collection.vendor,
          weight: collection.defaultWeight,
          reasoning: "Fallback to all existing collections",
        });
      }
    }

    logger.info("Fallback to all existing collections", {
      collections: existing.map((c) => c.vendor),
      count: existing.length,
    });

    return existing;
  }

  invalidateCache(): void {
    this._existingCollectionsCache = null;
    this._cacheTimestamp = 0;
  }
}

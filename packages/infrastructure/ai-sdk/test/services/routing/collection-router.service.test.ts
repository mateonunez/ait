import { describe, it, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { CollectionRouterService } from "../../../src/services/routing/collection-router.service";
import type { AItClient } from "../../../src/client/ai-sdk.client";
import type { ICollectionDiscoveryService } from "../../../src/services/metadata/collection-discovery.service";

describe("CollectionRouterService", () => {
  const mockGenerateStructured = mock.fn<(...args: any[]) => Promise<any>>();

  const mockClient = {
    generateStructured: mockGenerateStructured as unknown as <T>(options: any) => Promise<T>,
    generationModelConfig: { name: "test-model" },
  } as unknown as AItClient;

  const mockDiscoveryService = {
    getExistingCollectionVendors: mock.fn(async () => new Set(["spotify", "github"])),
  } as unknown as ICollectionDiscoveryService;

  afterEach(() => {
    mockGenerateStructured.mock.resetCalls();
  });

  it("should route to single collection when intent is clear", async () => {
    const service = new CollectionRouterService({}, mockDiscoveryService, mockClient);

    mockGenerateStructured.mock.mockImplementationOnce(async () => ({
      strategy: "single-collection",
      confidence: 0.9,
      reasoning: "Clear intent",
      selectedCollections: [{ vendor: "spotify", weight: 0.9, reasoning: "Music query" }],
    }));

    const result = await service.routeCollections("play some music");

    assert.equal(result.strategy, "single-collection");
    assert.equal(result.selectedCollections.length, 1);
    assert.equal(result.selectedCollections[0].vendor, "spotify");
  });

  it("should handle broad queries", async () => {
    const service = new CollectionRouterService({}, mockDiscoveryService, mockClient);

    // Mock broad query check
    mockGenerateStructured.mock.mockImplementationOnce(async () => ({
      isBroad: true,
      confidence: 0.9,
      reasoning: "Broad query",
    }));

    const result = await service.routeCollections("tell me everything");

    assert.equal(result.strategy, "all-collections");
    assert.ok(result.selectedCollections.length >= 2);
  });

  it("should fallback to heuristics on LLM failure", async () => {
    const service = new CollectionRouterService({}, mockDiscoveryService, mockClient);

    // Mock broad query check (false)
    mockGenerateStructured.mock.mockImplementationOnce(async () => ({
      isBroad: false,
      confidence: 0.9,
      reasoning: "Specific query",
    }));

    // Mock routing failure
    mockGenerateStructured.mock.mockImplementationOnce(async () => {
      throw new Error("API Error");
    });

    const result = await service.routeCollections("spotify music");

    assert.ok(result.selectedCollections.some((c) => c.vendor === "spotify"));
    assert.ok(result.reasoning.includes("heuristic"));
  });
});

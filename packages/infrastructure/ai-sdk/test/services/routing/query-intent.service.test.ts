import { describe, it, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { QueryIntentService } from "../../../src/services/routing/query-intent.service";
import type { AItClient } from "../../../src/client/ai-sdk.client";

describe("QueryIntentService", () => {
  const mockGenerateStructured = mock.fn<(...args: any[]) => Promise<any>>();

  // Create a mock client object that satisfies the AItClient interface partially (as needed)
  const mockClient = {
    generateStructured: mockGenerateStructured as unknown as <T>(options: any) => Promise<T>,
  } as unknown as AItClient;

  afterEach(() => {
    mockGenerateStructured.mock.resetCalls();
  });

  it("should analyze intent correctly", async () => {
    const service = new QueryIntentService(mockClient);

    mockGenerateStructured.mock.mockImplementationOnce(async () => ({
      entityTypes: ["tweet", "recently_played"],
      isTemporalQuery: true,
      timeReference: "last week",
      primaryFocus: "correlation between songs and tweets",
      complexityScore: 7,
      requiredStyle: "detailed",
      topicShift: false,
    }));

    const result = await service.analyzeIntent("What was I listening to while tweeting last week?");

    assert.deepEqual(result.entityTypes, ["tweet", "recently_played"]);
    assert.equal(result.isTemporalQuery, true);
    assert.equal(result.timeReference, "last week");
    assert.equal(result.complexityScore, 7);
    assert.equal(result.requiredStyle, "detailed");
  });

  it("should handle errors gracefully", async () => {
    const service = new QueryIntentService(mockClient);

    mockGenerateStructured.mock.mockImplementationOnce(async () => {
      throw new Error("API Error");
    });

    const result = await service.analyzeIntent("Simple query");

    assert.deepEqual(result.entityTypes, []);
    assert.equal(result.isTemporalQuery, false);
    assert.equal(result.complexityScore, 1);
    assert.equal(result.requiredStyle, "detailed");
  });

  it("should normalize entity types", async () => {
    const service = new QueryIntentService(mockClient);

    mockGenerateStructured.mock.mockImplementationOnce(async () => ({
      entityTypes: ["RECENTLY-PLAYED", "Invalid_Type"],
      isTemporalQuery: false,
      primaryFocus: "test",
      complexityScore: 1,
      requiredStyle: "concise",
      topicShift: false,
    }));

    const result = await service.analyzeIntent("test");

    // Should convert to lowercase, replace separators, and filter invalid
    assert.ok(result.entityTypes.includes("recently_played"));
    assert.ok(!result.entityTypes.includes("invalid_type"));
  });
});

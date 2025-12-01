import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { ContextBuilder } from "../../../src/services/context/context.builder";
import type { BaseMetadata, Document } from "../../../src/types/documents";

describe("ContextBuilder", () => {
  let builder: ContextBuilder;

  beforeEach(() => {
    builder = new ContextBuilder();
  });

  it("should build context from simple documents", () => {
    const docs: Document<BaseMetadata>[] = [
      {
        pageContent: "Content 1",
        metadata: { id: "1", score: 1 },
      } as unknown as Document<BaseMetadata>,
      {
        pageContent: "Content 2",
        metadata: { id: "2", score: 0.8 },
      } as unknown as Document<BaseMetadata>,
    ];

    const result = builder.buildContextFromDocuments(docs);
    assert.ok(result.includes("Content 1"));
    assert.ok(result.includes("Content 2"));
  });

  it("should format Spotify tracks correctly", () => {
    const doc: Document<BaseMetadata> = {
      pageContent: "track info",
      metadata: {
        id: "track1",
        __type: "track",
        name: "Lately",
        artist: "Allan Rayman",
        popularity: 80,
      },
    };

    const result = builder.buildContextFromDocuments([doc]);
    assert.ok(result.includes('Track: "Lately" by Allan Rayman'));
    assert.ok(result.includes("(popularity: 80/100)"));
  });

  it("should format GitHub repositories correctly", () => {
    const doc: Document<BaseMetadata> = {
      pageContent: "repo info",
      metadata: {
        id: "repo1",
        __type: "repository",
        fullName: "mateonunez/ait",
        stars: 100,
        language: "TypeScript",
      },
    };

    const result = builder.buildContextFromDocuments([doc]);
    assert.ok(result.includes('Repository: "mateonunez/ait"'));
    assert.ok(result.includes("100 stars"));
    assert.ok(result.includes("(TypeScript)"));
  });
});

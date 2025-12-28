import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateMetadataAgainstDiscoveredTools } from "./tool-metadata.store";

describe("tool-metadata.store", () => {
  it("should not report missing metadata for required tools when provided", () => {
    const { missingMetadata } = validateMetadataAgainstDiscoveredTools({
      discoveredToolsByVendor: {
        notion: ["API-post-search", "API-post-page"],
        slack: ["slack_post_message", "slack_list_channels"],
        github: ["list_repos"],
        linear: ["list_projects"],
      } as any,
    });

    assert.equal(missingMetadata.length, 0);
  });
});

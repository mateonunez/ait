import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConnectorGitHubStore } from "./connector.github.store";

describe("ConnectorGitHubStore", () => {
  let store: ConnectorGitHubStore;

  beforeEach(() => {
    store = new ConnectorGitHubStore();
  });

  it("should instantiate correctly", () => {
    assert.ok(store);
  });
});

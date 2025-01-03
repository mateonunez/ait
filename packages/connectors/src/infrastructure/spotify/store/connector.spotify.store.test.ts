import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConnectorSpotifyStore } from "./connector.spotify.store";

describe("ConnectorSpotifyStore", () => {
  let store: ConnectorSpotifyStore;

  beforeEach(() => {
    store = new ConnectorSpotifyStore();
  });

  it("should instantiate correctly", () => {
    assert.ok(store);
  });
});

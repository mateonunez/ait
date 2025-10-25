import type { QdrantProvider } from "../rag/qdrant.provider";
import type { ConnectorSpotifyService } from "@ait/connectors";
import { createSpotifyTools } from "./domains/spotify.tools";

export { createSpotifyTools } from "./domains/spotify.tools";
export { spotifySearchSchema } from "./domains/spotify.tools";
export type { SpotifySearchResult } from "./domains/spotify.tools";

export function createAllConnectorTools(qdrantProvider: QdrantProvider, spotifyService?: ConnectorSpotifyService) {
  return {
    ...createSpotifyTools(qdrantProvider, spotifyService),
  };
}

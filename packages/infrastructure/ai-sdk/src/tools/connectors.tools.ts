import type { ConnectorSpotifyService } from "@ait/connectors";
import { createSpotifyTools } from "./domains/spotify.tools";

export { createSpotifyTools } from "./domains/spotify.tools";
export { spotifySearchSchema } from "./domains/spotify.tools";
export type { SpotifySearchResult } from "./domains/spotify.tools";

export function createAllConnectorTools(spotifyService?: ConnectorSpotifyService) {
  return {
    ...createSpotifyTools(spotifyService),
  };
}

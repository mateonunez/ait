import type { SpotifyServiceInterface } from "../interfaces/spotify.service.interface";
import { createSpotifyTools } from "./domains/spotify.tools";

export { createSpotifyTools } from "./domains/spotify.tools";
export { spotifySearchSchema } from "./domains/spotify.tools";
export type { SpotifySearchResult } from "./domains/spotify.tools";

export function createAllConnectorTools(spotifyService?: SpotifyServiceInterface) {
  return {
    ...createSpotifyTools(spotifyService),
  };
}

import type { SpotifyCurrentlyPlayingExternal, SpotifyTrackEntity, SpotifyTrackExternal } from "@ait/core";

export interface SpotifyServiceInterface {
  fetchCurrentlyPlaying(): Promise<
    | (SpotifyCurrentlyPlayingExternal & {
        item: SpotifyTrackExternal & { trackEntity: SpotifyTrackEntity };
      })
    | null
  >;
}

import { z } from "zod";
import type { QdrantProvider } from "../../rag/qdrant.provider";
import { createTool } from "../../types/tools";
import type {
  ConnectorSpotifyService,
  SpotifyCurrentlyPlayingExternal,
  SpotifyRecentlyPlayedEntity,
  SpotifyTrackEntity,
  SpotifyTrackExternal,
} from "@ait/connectors";

// Spotify Schemas
export const spotifySearchSchema = z.object({
  query: z.string().describe("The search query for Spotify content"),
  type: z
    .enum(["playlist", "track", "artist", "album", "all"])
    .optional()
    .default("all")
    .describe("Type of Spotify content to search for"),
  limit: z.number().optional().default(10).describe("Maximum number of results to return"),
});

export const spotifyRecentlyPlayedSchema = z.object({
  limit: z.number().optional().default(20).describe("Maximum number of recently played tracks to return (max 50)"),
});

export const spotifyCurrentlyPlayingSchema = z.object({});

// Spotify Result Types
export interface SpotifySearchResult {
  type: string;
  name?: string;
  artist?: string;
  description?: string;
  content: string;
}

// Cleaned track data for LLM (excludes raw JSON blobs from the full entity)
export interface SpotifyCurrentlyPlayingResult {
  is_playing: boolean;
  track: {
    id: string;
    name: string;
    artist: string; // Joined by mapper from artists array
    album: string | null; // Extracted by mapper from album object
    durationMs: number;
    explicit: boolean;
    popularity: number | null;
    uri: string | null;
    __type: "track";
  };
  progress_ms: number;
  timestamp: number;
  context?: {
    type: string;
    uri: string;
  } | null;
}

export interface SpotifyRecentlyPlayedResult {
  track: {
    id: string;
    name: string;
    artist: string;
    album: string | null;
    durationMs: number;
    explicit: boolean;
    popularity: number | null;
    uri: string | null;
    __type: "track";
  };
  playedAt: string;
  context?: {
    type: string;
    uri: string;
  } | null;
}

export interface SearchResponse<T> {
  results: T[];
  count: number;
  error?: string;
}

interface ExtendedSpotifyService extends ConnectorSpotifyService {
  getCurrentlyPlaying(): Promise<
    | (SpotifyCurrentlyPlayingExternal & {
        item: SpotifyTrackExternal & { trackEntity: SpotifyTrackEntity };
      })
    | null
  >;
}

export function createSpotifyTools(qdrantProvider: QdrantProvider, spotifyService?: ExtendedSpotifyService) {
  return {
    // searchSpotify: createTool({
    //   description:
    //     "Search Spotify data including playlists, tracks, artists, or albums by name, artist, or description",
    //   parameters: spotifySearchSchema,
    //   execute: async ({ query, type, limit }): Promise<SearchResponse<SpotifySearchResult>> => {
    //     try {
    //       const results = await qdrantProvider.similaritySearch(
    //         `spotify ${type !== "all" ? type : ""} ${query}`.trim(),
    //         limit ?? 10,
    //       );

    //       const filtered =
    //         type !== "all"
    //           ? results.filter((doc) => {
    //               const docType = doc.metadata.__type.toLowerCase();
    //               return docType.includes(type ?? "");
    //             })
    //           : results.filter((doc) => {
    //               const docType = doc.metadata.__type.toLowerCase();
    //               return docType.startsWith("spotify");
    //             });

    //       return {
    //         results: filtered.map(
    //           (doc): SpotifySearchResult => ({
    //             type: doc.metadata.__type,
    //             name: typeof doc.metadata.name === "string" ? doc.metadata.name : undefined,
    //             artist: typeof doc.metadata.artist === "string" ? doc.metadata.artist : undefined,
    //             content: doc.pageContent.slice(0, 200),
    //           }),
    //         ),
    //         count: filtered.length,
    //       };
    //     } catch (error) {
    //       return {
    //         error: error instanceof Error ? error.message : String(error),
    //         results: [],
    //         count: 0,
    //       };
    //     }
    //   },
    // }),

    getCurrentlyPlaying: createTool({
      description:
        "Fetch the user's CURRENTLY PLAYING track on Spotify RIGHT NOW. MUST be called when user asks: 'what am I listening to', 'what's playing now', 'current song', 'what's on', or similar queries about LIVE/CURRENT music playback. Returns real-time data directly from Spotify API showing exactly what is playing at this moment.",
      parameters: spotifyCurrentlyPlayingSchema,
      execute: async (): Promise<SearchResponse<SpotifyCurrentlyPlayingResult>> => {
        try {
          if (!spotifyService) {
            return {
              error: "Spotify service not available. Please configure Spotify authentication.",
              results: [],
              count: 0,
            };
          }

          const currentlyPlaying = await spotifyService.getCurrentlyPlaying();

          if (!currentlyPlaying) {
            return {
              results: [],
              count: 0,
              error: "No track is currently playing on Spotify.",
            };
          }

          const result: SpotifyCurrentlyPlayingResult = {
            is_playing: currentlyPlaying.is_playing,
            track: {
              id: currentlyPlaying.item.id!,
              name: currentlyPlaying.item.name!,
              artist: currentlyPlaying.item.artists!.map((artist: { name?: string }) => artist.name!).join(", "),
              album: currentlyPlaying.item.album!.name!,
              durationMs: currentlyPlaying.item.duration_ms!,
              explicit: currentlyPlaying.item.explicit!,
              popularity: currentlyPlaying.item.popularity!,
              uri: currentlyPlaying.item.uri!,
              __type: currentlyPlaying.item.__type as "track",
            },
            progress_ms: currentlyPlaying.progress_ms,
            timestamp: currentlyPlaying.timestamp,
            context: currentlyPlaying.context,
          };

          return {
            results: [result],
            count: 1,
          };
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : String(error),
            results: [],
            count: 0,
          };
        }
      },
    }),

    getRecentlyPlayed: createTool({
      description:
        "Fetch the user's LIVE recently played Spotify tracks with timestamps. MUST be called when user asks: 'what am I listening to', 'recently played', 'current music', 'latest songs', or similar queries about CURRENT/RECENT music activity. Returns real-time data directly from Spotify API, not historical context.",
      parameters: spotifyRecentlyPlayedSchema,
      execute: async ({ limit }): Promise<SearchResponse<SpotifyRecentlyPlayedResult>> => {
        try {
          if (!spotifyService) {
            return {
              error: "Spotify service not available. Please configure Spotify authentication.",
              results: [],
              count: 0,
            };
          }

          const recentlyPlayedEntities = await spotifyService.getRecentlyPlayed();

          // Limit the results if a limit is specified
          const limitedResults = limit ? recentlyPlayedEntities.slice(0, limit) : recentlyPlayedEntities;

          const results: SpotifyRecentlyPlayedResult[] = limitedResults.map((entity: SpotifyRecentlyPlayedEntity) => ({
            track: {
              id: entity.trackId,
              name: entity.trackName,
              artist: entity.artist,
              album: entity.album,
              durationMs: entity.durationMs,
              explicit: entity.explicit,
              popularity: entity.popularity,
              uri: null,
              __type: "track" as const,
            },
            playedAt: entity.playedAt.toISOString(),
            context: entity.context,
          }));

          return {
            results,
            count: results.length,
          };
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : String(error),
            results: [],
            count: 0,
          };
        }
      },
    }),
  };
}

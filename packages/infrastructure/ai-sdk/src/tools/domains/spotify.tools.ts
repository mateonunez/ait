import { z } from "zod";
import { createTool } from "../../types/tools";
import type { SpotifyServiceInterface } from "../../interfaces/spotify.service.interface";

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

export function createSpotifyTools(spotifyService?: SpotifyServiceInterface) {
  return {
    getCurrentlyPlaying: createTool({
      description:
        "Fetch the user's CURRENTLY PLAYING track on Spotify RIGHT NOW at this exact moment. ONLY call this tool when user explicitly asks about PRESENT/CURRENT playback using present tense: 'what am I listening to', 'what's playing now', 'current song', 'what's on right now'. DO NOT call this tool for PAST queries ('what was playing', 'what were you listening', 'while tweeting') - those are answered from RAG context showing historical data. This tool is ONLY for real-time current playback status.",
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

          const currentlyPlaying = await spotifyService.fetchCurrentlyPlaying();

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
  };
}

import { z } from "zod";
import type { QdrantProvider } from "../rag/qdrant.provider";
import {
  createTool,
  type SpotifySearchResult,
  type GitHubSearchResult,
  type TwitterSearchResult,
  type LinearSearchResult,
  type SearchResponse,
} from "../types/tools";

export function createSpotifyTools(qdrantProvider: QdrantProvider) {
  return {
    searchSpotify: createTool({
      description:
        "Search Spotify data including playlists, tracks, artists, or albums by name, artist, or description",
      parameters: z.object({
        query: z.string().describe("The search query for Spotify content"),
        type: z
          .enum(["playlist", "track", "artist", "album", "all"])
          .optional()
          .default("all")
          .describe("Type of Spotify content to search for"),
        limit: z.number().optional().default(10).describe("Maximum number of results to return"),
      }),
      execute: async ({ query, type, limit }): Promise<SearchResponse<SpotifySearchResult>> => {
        try {
          const results = await qdrantProvider.similaritySearch(
            `spotify ${type !== "all" ? type : ""} ${query}`.trim(),
            limit ?? 10,
          );

          const filtered =
            type !== "all"
              ? results.filter((doc) => {
                  const docType = doc.metadata.__type.toLowerCase();
                  return docType.includes(type ?? "");
                })
              : results.filter((doc) => {
                  const docType = doc.metadata.__type.toLowerCase();
                  return docType.startsWith("spotify");
                });

          return {
            results: filtered.map(
              (doc): SpotifySearchResult => ({
                type: doc.metadata.__type,
                name: typeof doc.metadata.name === "string" ? doc.metadata.name : undefined,
                artist: typeof doc.metadata.artist === "string" ? doc.metadata.artist : undefined,
                content: doc.pageContent.slice(0, 200),
              }),
            ),
            count: filtered.length,
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

export function createGitHubTools(qdrantProvider: QdrantProvider) {
  return {
    searchGitHub: createTool({
      description: "Search GitHub repositories by name, description, language, or topics",
      parameters: z.object({
        query: z.string().describe("The search query for GitHub repositories"),
        language: z.string().optional().describe("Filter by programming language"),
        topics: z.array(z.string()).optional().describe("Filter by repository topics"),
        limit: z.number().optional().default(10).describe("Maximum number of results to return"),
      }),
      execute: async ({ query, language, topics, limit }): Promise<SearchResponse<GitHubSearchResult>> => {
        try {
          let searchQuery = `github repository ${query}`;
          if (language) {
            searchQuery += ` ${language}`;
          }
          if (topics && topics.length > 0) {
            searchQuery += ` ${topics.join(" ")}`;
          }

          const results = await qdrantProvider.similaritySearch(searchQuery, limit ?? 10);

          const filtered = results.filter((doc) => {
            const docType = doc.metadata.__type.toLowerCase();
            return docType.includes("github") || docType.includes("repository");
          });

          return {
            results: filtered.map(
              (doc): GitHubSearchResult => ({
                type: doc.metadata.__type,
                name: typeof doc.metadata.name === "string" ? doc.metadata.name : undefined,
                description: typeof doc.metadata.description === "string" ? doc.metadata.description : undefined,
                language: typeof doc.metadata.language === "string" ? doc.metadata.language : undefined,
                topics: Array.isArray(doc.metadata.topics) ? doc.metadata.topics : undefined,
                stars: typeof doc.metadata.stars === "number" ? doc.metadata.stars : undefined,
                forks: typeof doc.metadata.forks === "number" ? doc.metadata.forks : undefined,
                content: doc.pageContent.slice(0, 200),
              }),
            ),
            count: filtered.length,
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

export function createTwitterTools(qdrantProvider: QdrantProvider) {
  return {
    searchTwitter: createTool({
      description: "Search X (Twitter) tweets by content, mentions, or hashtags",
      parameters: z.object({
        query: z.string().describe("The search query for tweets"),
        dateRange: z
          .object({
            from: z.string().optional().describe("Start date in YYYY-MM-DD format"),
            to: z.string().optional().describe("End date in YYYY-MM-DD format"),
          })
          .optional()
          .describe("Filter tweets by date range"),
        limit: z.number().optional().default(10).describe("Maximum number of results to return"),
      }),
      execute: async ({ query, dateRange, limit }): Promise<SearchResponse<TwitterSearchResult>> => {
        try {
          let searchQuery = `twitter tweet ${query}`;
          if (dateRange?.from) {
            searchQuery += ` ${dateRange.from}`;
          }
          if (dateRange?.to) {
            searchQuery += ` ${dateRange.to}`;
          }

          const results = await qdrantProvider.similaritySearch(searchQuery, limit ?? 10);

          const filtered = results.filter((doc) => {
            const docType = doc.metadata.__type.toLowerCase();
            return docType.includes("tweet") || docType.includes("twitter") || docType.includes("x");
          });

          return {
            results: filtered.map(
              (doc): TwitterSearchResult => ({
                type: doc.metadata.__type,
                text: doc.pageContent.slice(0, 280),
                mentions: Array.isArray(doc.metadata.mentions) ? doc.metadata.mentions : undefined,
                hashtags: Array.isArray(doc.metadata.hashtags) ? doc.metadata.hashtags : undefined,
                created_at: typeof doc.metadata.created_at === "string" ? doc.metadata.created_at : undefined,
                likes: typeof doc.metadata.likes === "number" ? doc.metadata.likes : undefined,
                retweets: typeof doc.metadata.retweets === "number" ? doc.metadata.retweets : undefined,
              }),
            ),
            count: filtered.length,
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

export function createLinearTools(qdrantProvider: QdrantProvider) {
  return {
    searchLinear: createTool({
      description: "Search Linear issues by title, description, state, priority, or labels",
      parameters: z.object({
        query: z.string().describe("The search query for Linear issues"),
        state: z.enum(["open", "closed", "all"]).optional().default("all").describe("Filter by issue state"),
        priority: z
          .enum(["urgent", "high", "medium", "low", "all"])
          .optional()
          .default("all")
          .describe("Filter by priority"),
        limit: z.number().optional().default(10).describe("Maximum number of results to return"),
      }),
      execute: async ({ query, state, priority, limit }): Promise<SearchResponse<LinearSearchResult>> => {
        try {
          let searchQuery = `linear issue ${query}`;
          if (state !== "all") {
            searchQuery += ` ${state}`;
          }
          if (priority !== "all") {
            searchQuery += ` ${priority}`;
          }

          const results = await qdrantProvider.similaritySearch(searchQuery, limit ?? 10);

          const filtered = results.filter((doc) => {
            const docType = doc.metadata.__type.toLowerCase();
            return docType.includes("linear") || docType.includes("issue");
          });

          return {
            results: filtered.map(
              (doc): LinearSearchResult => ({
                type: doc.metadata.__type,
                title: typeof doc.metadata.title === "string" ? doc.metadata.title : undefined,
                description: doc.pageContent.slice(0, 200),
                state: typeof doc.metadata.state === "string" ? doc.metadata.state : undefined,
                priority: typeof doc.metadata.priority === "string" ? doc.metadata.priority : undefined,
                labels: Array.isArray(doc.metadata.labels) ? doc.metadata.labels : undefined,
                assignee: typeof doc.metadata.assignee === "string" ? doc.metadata.assignee : undefined,
              }),
            ),
            count: filtered.length,
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

export function createAllConnectorTools(qdrantProvider: QdrantProvider) {
  return {
    ...createSpotifyTools(qdrantProvider),
    ...createGitHubTools(qdrantProvider),
    ...createTwitterTools(qdrantProvider),
    ...createLinearTools(qdrantProvider),
  };
}

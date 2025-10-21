import { z } from "zod";
import type { QdrantProvider } from "../rag/qdrant.provider";

// Tool interface compatible with our custom implementation
interface Tool<TParams = any, TResult = any> {
  description: string;
  parameters: z.ZodSchema<TParams>;
  execute: (params: TParams) => Promise<TResult>;
}

function tool<TParams, TResult>(config: Tool<TParams, TResult>): Tool<TParams, TResult> {
  return config;
}

export function createSpotifyTools(qdrantProvider: QdrantProvider) {
  return {
    searchSpotify: tool({
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
      execute: async ({ query, type, limit }) => {
        try {
          const results = await qdrantProvider.similaritySearch(
            `spotify ${type !== "all" ? type : ""} ${query}`.trim(),
            limit ?? 10,
          );

          const filtered =
            type !== "all"
              ? results.filter((doc) => {
                  const docType = (doc.metadata?.__type as string) || "";
                  return docType.toLowerCase().includes(type ?? "");
                })
              : results.filter((doc) => {
                  const docType = (doc.metadata?.__type as string) || "";
                  return docType.toLowerCase().includes("spotify");
                });

          return {
            results: filtered.map((doc) => ({
              type: doc.metadata?.__type,
              name: doc.metadata?.name,
              artist: doc.metadata?.artist,
              content: doc.pageContent.slice(0, 200),
            })),
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
    searchGitHub: tool({
      description: "Search GitHub repositories by name, description, language, or topics",
      parameters: z.object({
        query: z.string().describe("The search query for GitHub repositories"),
        language: z.string().optional().describe("Filter by programming language"),
        topics: z.array(z.string()).optional().describe("Filter by repository topics"),
        limit: z.number().optional().default(10).describe("Maximum number of results to return"),
      }),
      execute: async ({ query, language, topics, limit }) => {
        try {
          // Build search query with filters
          let searchQuery = `github repository ${query}`;
          if (language) {
            searchQuery += ` ${language}`;
          }
          if (topics && topics.length > 0) {
            searchQuery += ` ${topics.join(" ")}`;
          }

          const results = await qdrantProvider.similaritySearch(searchQuery, limit ?? 10);

          const filtered = results.filter((doc) => {
            const docType = (doc.metadata?.__type as string) || "";
            return docType.toLowerCase().includes("github");
          });

          return {
            results: filtered.map((doc) => ({
              type: doc.metadata?.__type,
              name: doc.metadata?.name,
              description: doc.metadata?.description,
              language: doc.metadata?.language,
              topics: doc.metadata?.topics,
              content: doc.pageContent.slice(0, 200),
            })),
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
    searchTwitter: tool({
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
      execute: async ({ query, dateRange, limit }) => {
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
            const docType = (doc.metadata?.__type as string) || "";
            return docType.toLowerCase().includes("twitter") || docType.toLowerCase().includes("tweet");
          });

          return {
            results: filtered.map((doc) => ({
              type: doc.metadata?.__type,
              text: doc.pageContent.slice(0, 280),
              mentions: doc.metadata?.mentions,
              hashtags: doc.metadata?.hashtags,
              created_at: doc.metadata?.created_at,
            })),
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
    searchLinear: tool({
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
      execute: async ({ query, state, priority, limit }) => {
        try {
          // Build search query with filters
          let searchQuery = `linear issue ${query}`;
          if (state !== "all") {
            searchQuery += ` ${state}`;
          }
          if (priority !== "all") {
            searchQuery += ` ${priority}`;
          }

          const results = await qdrantProvider.similaritySearch(searchQuery, limit ?? 10);

          const filtered = results.filter((doc) => {
            const docType = (doc.metadata?.__type as string) || "";
            return docType.toLowerCase().includes("linear");
          });

          return {
            results: filtered.map((doc) => ({
              type: doc.metadata?.__type,
              title: doc.metadata?.title,
              description: doc.pageContent.slice(0, 200),
              state: doc.metadata?.state,
              priority: doc.metadata?.priority,
              labels: doc.metadata?.labels,
              assignee: doc.metadata?.assignee,
            })),
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

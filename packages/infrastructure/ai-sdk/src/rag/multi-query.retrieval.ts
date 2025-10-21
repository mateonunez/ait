import type { Document } from "./qdrant.provider";
import type { QdrantProvider } from "./qdrant.provider";
import { getAItClient } from "../client/ai-sdk.client";

export interface MultiQueryRetrievalConfig {
  maxDocs?: number;
  queriesCount?: number;
}

export class MultiQueryRetrieval {
  private readonly maxDocs: number;
  private readonly queriesCount: number;

  constructor(config: MultiQueryRetrievalConfig = {}) {
    this.maxDocs = config.maxDocs || 100;
    this.queriesCount = config.queriesCount || 12;
  }

  async planQueriesWithLLM(userPrompt: string): Promise<string[]> {
    const client = getAItClient();

    const instruction = [
      "You are a retrieval query planner for AIt's knowledge base populated via 4 Connectors: Spotify, GitHub, X (Twitter), and Linear.",
      `Your goal: generate ${this.queriesCount}-16 diverse keyword queries to retrieve documents from ALL connectors, ensuring comprehensive coverage.`,
      "Required: Generate at least 2-3 queries for EACH connector type to avoid missing data sources.",
      "",
      "CONNECTOR-SPECIFIC GUIDANCE:",
      "- Spotify: Query playlists (name, description, owner), tracks (name, artist, album), artists (name, genres), albums (name, artist, genres, label).",
      "- GitHub: Query repositories (name, description, language, topics, stars, forks).",
      "- X (Twitter): Query tweets (text content, mentions, hashtags, engagement metrics); avoid tweet_id.",
      "- Linear: Query issues (title, description, state, priority, labels, assignee).",
      "",
      "STRATEGY:",
      "1. Identify key concepts from user request (e.g., 'digital footprint' → code, playlists, tweets, issues)",
      "2. Generate 3-4 queries per connector covering different aspects",
      "3. Combine entity names (mateo, user) with connector-specific fields",
      "4. Include temporal hints if present (YYYY-MM-DD format)",
      "5. Avoid IDs/URIs/hashes (spotify:*, commit hashes, tweet IDs)",
      "",
      "FORMAT: Keep queries concise (2-6 words), lowercase, space-separated, no punctuation.",
      "OUTPUT: ONLY a JSON array of 12-16 strings.",
    ].join(" ");

    const composed = `${instruction}\n\nUser Request:\n${userPrompt}`;

    try {
      const result = await client.generationModel.doGenerate({
        prompt: composed,
        temperature: 0.7,
      });

      const parsed = this._extractJsonArray(result.text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((q) => (typeof q === "string" ? q.trim() : ""))
          .filter((q) => q.length > 0)
          .slice(0, 16);
      }
    } catch (error) {
      console.warn("Failed to plan queries with LLM", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return [userPrompt];
  }

  async retrieveWithMultiQueries(vectorStore: QdrantProvider, userPrompt: string): Promise<Document[]> {
    const queries = await this.planQueriesWithLLM(userPrompt);

    console.debug("Queries", queries);

    const totalBudget = Math.max(10, this.maxDocs);
    const perQueryK = Math.max(2, Math.floor(totalBudget / Math.max(1, queries.length)));

    type Scored = { doc: Document; score: number };
    const bestById = new Map<string, Scored>();

    let successfulQueries = 0;
    let lastError: Error | undefined;

    for (const q of queries) {
      try {
        const pairs = await vectorStore.similaritySearchWithScore(q, perQueryK);

        for (const [doc, score] of pairs) {
          const id = (doc.metadata as { id?: string })?.id || doc.pageContent.slice(0, 80);
          const prev = bestById.get(id);
          if (!prev || score > prev.score) {
            bestById.set(id, { doc, score });
          }
        }

        successfulQueries++;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.debug("Query variant failed", { query: q, error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (successfulQueries === 0 && lastError) {
      throw lastError;
    }

    const ranked = Array.from(bestById.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, totalBudget)
      .map((s) => s.doc);

    console.debug("Query variants used", { count: queries.length, perQueryK, returned: ranked.length });
    return ranked;
  }

  private _extractJsonArray(text: string): unknown[] | null {
    try {
      const direct = JSON.parse(text);
      return Array.isArray(direct) ? direct : null;
    } catch {}

    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        // Ignore parse error
      }
    }

    const bracket = text.match(/\[([\s\S]*?)\]/);
    if (bracket) {
      try {
        const parsed = JSON.parse(bracket[0]);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        // Ignore parse error
      }
    }

    return null;
  }
}

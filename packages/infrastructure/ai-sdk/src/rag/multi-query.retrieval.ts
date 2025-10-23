import type { QdrantProvider } from "./qdrant.provider";
import { getAItClient } from "../client/ai-sdk.client";
import type { Document, BaseMetadata, ScoredDocument } from "../types/documents";

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
      "You are a context-aware retrieval query planner for AIt's knowledge base with 4 data sources: Spotify, GitHub, X (Twitter), and Linear.",
      `Analyze the user's question and generate ${this.queriesCount}-16 targeted keyword queries focused on the MOST RELEVANT data sources.`,
      "",
      "DATA SOURCE ANALYSIS:",
      "- Music/listening/songs/artists/albums → Focus on Spotify",
      "- Code/projects/repositories/programming → Focus on GitHub",
      "- Tweets/social/posts/thoughts → Focus on X (Twitter)",
      "- Tasks/issues/work/projects/todos → Focus on Linear",
      "- General/broad questions → Use multiple sources strategically",
      "",
      "QUERY GENERATION STRATEGY:",
      "1. Identify the PRIMARY intent and relevant data sources",
      "2. Generate 6-12 queries for PRIMARY sources (deep coverage)",
      "3. Generate 2-4 queries for SECONDARY sources (context)",
      "4. Skip IRRELEVANT sources entirely",
      "5. Use entity names (mateo, user) with source-specific fields",
      "6. Include temporal hints if present (YYYY-MM-DD format)",
      "",
      "FIELD GUIDANCE BY SOURCE:",
      "- Spotify: playlists (name, description), tracks (name, artist, album), artists (name, genres), albums (name, artist, genres)",
      "- GitHub: repositories (name, description, language, topics, stars)",
      "- X (Twitter): tweets (text content, mentions, hashtags, engagement)",
      "- Linear: issues (title, description, state, priority, labels, assignee)",
      "",
      "CONSTRAINTS:",
      "- Keep queries concise (2-6 words), lowercase, space-separated",
      "- Avoid IDs/URIs/hashes (spotify:*, commit hashes, tweet IDs)",
      "- Focus on SEMANTIC content, not technical identifiers",
      "",
      "OUTPUT: ONLY a JSON array of 8-16 query strings, NO explanations.",
    ].join(" ");

    const composed = `${instruction}\n\nUser Question:\n${userPrompt}`;

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

  async retrieveWithMultiQueries(vectorStore: QdrantProvider, userPrompt: string): Promise<Document<BaseMetadata>[]> {
    const queries = await this.planQueriesWithLLM(userPrompt);

    console.debug("Queries", queries);

    const totalBudget = Math.max(10, this.maxDocs);
    const perQueryK = Math.max(2, Math.floor(totalBudget / Math.max(1, queries.length)));

    const bestById = new Map<string, ScoredDocument<BaseMetadata>>();

    let successfulQueries = 0;
    let lastError: Error | undefined;

    for (const q of queries) {
      try {
        const pairs = await vectorStore.similaritySearchWithScore(q, perQueryK);

        for (const [doc, score] of pairs) {
          const id = doc.metadata.id || doc.pageContent.slice(0, 80);
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

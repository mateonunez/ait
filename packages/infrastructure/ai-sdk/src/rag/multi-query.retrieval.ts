import type { QdrantProvider } from "./qdrant.provider";
import { getAItClient } from "../client/ai-sdk.client";
import type { Document, BaseMetadata } from "../types/documents";

export interface MultiQueryRetrievalConfig {
  maxDocs?: number;
  queriesCount?: number;
  concurrency?: number;
}

type Hit = {
  doc: Document<BaseMetadata>;
  bestScore: number;
  sumScore: number;
  hits: number;
};

export class MultiQueryRetrieval {
  private readonly maxDocs: number;
  private readonly queriesCount: number;
  private readonly concurrency: number;

  constructor(config: MultiQueryRetrievalConfig = {}) {
    this.maxDocs = config.maxDocs ?? 100;
    this.queriesCount = Math.min(Math.max(config.queriesCount ?? 12, 4), 16);
    this.concurrency = Math.min(Math.max(config.concurrency ?? 4, 1), 8);
  }

  private async _planQueriesWithLLM(userPrompt: string): Promise<string[]> {
    const client = getAItClient();

    // Persona aligned, intent first, no platform tokens, no usernames, no boilerplate.
    const instruction = [
      "You are AIt, my semantic query planner for my personal knowledge base. Plan short, natural query variants to retrieve the most relevant items across my music, code, thoughts, and work.",
      "",
      "RULES",
      "1) Align to the user's question. Every query must be a facet or hypothesis of that intent.",
      "2) Write short noun phrases, lowercase, natural, 2 to 6 words.",
      "3) No platform or user tokens. Do not use words like spotify, github, twitter, x, linear, or mateo.",
      "4) No IDs, URIs, hashtags, quotes, or punctuation.",
      "5) Diversify meaning. Cover complementary angles, not micro-variations.",
      "6) Prefer concrete semantics over categories. Example good: current projects, recent commits, playlist moods, backend architecture, learning topics. Example bad: github repositories, spotify playlists, profile info.",
      "",
      "OUTPUT",
      `Return ONLY a JSON array of exactly ${this.queriesCount} strings. No explanations, no markdown.`,
    ].join("\n");

    const composed = `${instruction}\n\nUser question:\n${userPrompt.trim()}`;

    try {
      const result = await client.generationModel.doGenerate({
        prompt: composed,
        temperature: 0.6, // balanced: diverse but focused queries
        topP: 0.9,
      });

      const parsed = this._extractJsonArray(result.text);
      if (Array.isArray(parsed)) {
        const cleaned = this._normalizeAndDedupQueries(parsed as unknown[], this.queriesCount);
        if (cleaned.length > 0) return cleaned;
      }
    } catch (error) {
      console.warn("Failed to plan queries with LLM", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const seed = this._heuristicFacets(userPrompt);
    return this._normalizeAndDedupQueries(seed, Math.min(6, this.queriesCount));
  }

  async retrieveWithMultiQueries(vectorStore: QdrantProvider, userPrompt: string): Promise<Document<BaseMetadata>[]> {
    const queries = await this._planQueriesWithLLM(userPrompt);

    console.debug("Multi query retrieval queries", queries);

    const totalBudget = Math.max(10, this.maxDocs);
    const perQueryK = Math.max(2, Math.floor(totalBudget / Math.max(1, queries.length)));

    const hits = new Map<string, Hit>();

    // Concurrency control with simple worker pool
    const queue = [...queries];
    const workers: Promise<void>[] = [];
    const runWorker = async () => {
      while (queue.length) {
        const q = queue.shift()!;
        try {
          const pairs = await vectorStore.similaritySearchWithScore(q, perQueryK);
          for (const [doc, score] of pairs) {
            const id = doc.metadata.id || this._fallbackId(doc);
            const prev = hits.get(id);
            if (prev) {
              prev.hits += 1;
              prev.sumScore += score;
              if (score > prev.bestScore) prev.bestScore = score;
            } else {
              hits.set(id, { doc, bestScore: score, sumScore: score, hits: 1 });
            }
          }
        } catch (e) {
          console.debug("Query variant failed", { query: q, error: e instanceof Error ? e.message : String(e) });
          // continue
        }
      }
    };

    for (let i = 0; i < this.concurrency; i++) workers.push(runWorker());
    await Promise.all(workers);

    if (hits.size === 0) {
      throw new Error("No results retrieved across query variants");
    }

    // Rank: primary by bestScore, secondary by hit frequency and sumScore
    // Small boost for documents hit by multiple distinct queries
    const ranked = Array.from(hits.values())
      .map((h) => {
        const freqBoost = Math.log1p(h.hits); // 1.0 for single hit, grows slowly
        const blended = h.bestScore * 0.75 + (h.sumScore * 0.25) / Math.max(1, h.hits);
        const finalScore = blended * (1 + 0.05 * freqBoost);
        return { ...h, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, totalBudget)
      .map((h) => h.doc);

    console.debug("Query variants used", { count: queries.length, perQueryK, returned: ranked.length });

    return ranked;
  }

  private _normalizeAndDedupQueries(candidates: unknown[], limit: number): string[] {
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/["'`]/g, "")
        .replace(/[.,;:!?(){}\[\]\\/+*_#@%^&=<>|~]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const isValid = (s: string) => {
      if (!s) return false;
      if (/\b(spotify|github|twitter|x|linear|mateo)\b/i.test(s)) return false; // no platform or user tokens
      const words = s.split(" ").filter(Boolean);
      return words.length >= 2 && words.length <= 6;
    };

    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of candidates) {
      if (typeof c !== "string") continue;
      const q = norm(c);
      if (!isValid(q)) continue;
      if (seen.has(q)) continue;
      seen.add(q);
      result.push(q);
      if (result.length >= limit) break;
    }
    return result;
  }

  private _heuristicFacets(userPrompt: string): string[] {
    const base = userPrompt.trim().toLowerCase();
    // crude noun-ish facets to stay aligned without magic words
    const extras = [
      "current projects",
      "recent work",
      "learning focus",
      "favorite tools",
      "playlist moods",
      "writing themes",
      "backend architecture",
      "frontend patterns",
      "open questions",
      "roadmap goals",
      "recent commits",
      "notes and ideas",
    ];
    return [base, ...extras].slice(0, this.queriesCount);
  }

  private _fallbackId(doc: Document<BaseMetadata>): string {
    const src = doc.metadata?.source || "unknown";
    return `${src}:${doc.pageContent.slice(0, 80)}`;
  }

  private _extractJsonArray(text: string): unknown[] | null {
    // try direct JSON
    try {
      const direct = JSON.parse(text);
      return Array.isArray(direct) ? direct : null;
    } catch {}

    // fenced code block
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        const parsed = JSON.parse(fence[1]);
        return Array.isArray(parsed) ? parsed : null;
      } catch {}
    }

    // first bracketed array
    const bracket = text.match(/\[([\s\S]*?)\]/);
    if (bracket) {
      try {
        const parsed = JSON.parse(bracket[0]);
        return Array.isArray(parsed) ? parsed : null;
      } catch {}
    }

    return null;
  }
}

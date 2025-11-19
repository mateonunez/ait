import { AItError } from "@ait/core";
import { z } from "zod";
import { getAItClient } from "../../client/ai-sdk.client";
import type { Document, BaseMetadata } from "../../types/documents";
import { buildRerankPrompt } from "../prompts/ranking.prompts";

export interface IRerankService {
  rerank<TMetadata extends BaseMetadata>(
    query: string,
    documents: Document<TMetadata>[],
    topK?: number,
  ): Promise<Document<TMetadata>[]>;
}

const RerankSchema = z.object({
  scores: z.array(
    z.object({
      index: z.number(),
      relevance: z.number().min(0).max(10),
    }),
  ),
});

type RerankResponse = z.infer<typeof RerankSchema>;

export class RerankService implements IRerankService {
  private readonly _maxDocsForLLM: number = 100; // Limit LLM reranking to avoid prompt overload
  private readonly _docPreviewLength: number = 300; // Increased from 200 for better context

  async rerank<TMetadata extends BaseMetadata>(
    query: string,
    documents: Document<TMetadata>[],
    topK = 100,
  ): Promise<Document<TMetadata>[]> {
    if (documents.length === 0) return [];
    if (documents.length === 1) return documents;

    // If documents exceed max, only rerank the top candidates based on existing scores
    let docsToRerank = documents;
    if (documents.length > this._maxDocsForLLM) {
      console.warn("Document count exceeds LLM reranking limit, pre-filtering to top candidates", {
        totalDocs: documents.length,
        maxDocs: this._maxDocsForLLM,
      });

      // Sort by existing score and take top candidates
      docsToRerank = [...documents]
        .sort((a, b) => {
          const scoreA = (a.metadata.score as number) || 0;
          const scoreB = (b.metadata.score as number) || 0;
          return scoreB - scoreA;
        })
        .slice(0, this._maxDocsForLLM);
    }

    const llm = getAItClient();

    try {
      const prompt = buildRerankPrompt(query, docsToRerank, this._docPreviewLength);

      const object = await llm.generateStructured<RerankResponse>({
        schema: RerankSchema,
        temperature: 0.3,
        prompt,
      });

      // Create a map of index -> score from LLM response
      const scoreMap = new Map<number, number>();
      for (const scoreEntry of object.scores) {
        scoreMap.set(scoreEntry.index, scoreEntry.relevance);
      }

      // Score all documents (reranked + remainder if any)
      const scored = documents.map((doc, i) => {
        // If this doc was in the reranked subset, use LLM score
        const rerankIndex = docsToRerank.indexOf(doc);
        const score = rerankIndex >= 0 ? (scoreMap.get(rerankIndex) ?? 0) : 0;

        return {
          doc,
          score,
          wasReranked: rerankIndex >= 0,
        };
      });

      scored.sort((a, b) => {
        // Prioritize reranked documents, then by score
        if (a.wasReranked !== b.wasReranked) {
          return a.wasReranked ? -1 : 1;
        }
        return b.score - a.score;
      });

      // Attach rerank scores to documents (normalized to 0-1 range)
      const result = scored.slice(0, topK).map((s) => {
        const doc = s.doc;
        doc.metadata = {
          ...doc.metadata,
          score: s.score / 10, // Normalize 0-10 to 0-1
          rerankScore: s.score,
          wasReranked: s.wasReranked,
        };
        return doc;
      });

      console.debug("Reranking completed", {
        inputDocs: documents.length,
        rerankedDocs: docsToRerank.length,
        outputDocs: result.length,
        topScores: scored.slice(0, 3).map((s) => s.score.toFixed(1)),
      });

      return result;
    } catch (error) {
      console.warn("Reranking failed, propagating fallback", {
        error: error instanceof Error ? error.message : String(error),
        docCount: documents.length,
      });
      throw new AItError(
        "RERANK_FAILED",
        `Rerank failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error,
      );
    }
  }
}

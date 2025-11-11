import { AItError } from "@ait/core";
import { z } from "zod";
import { getAItClient } from "../../client/ai-sdk.client";
import type { Document, BaseMetadata } from "../../types/documents";

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

export class RerankService implements IRerankService {
  async rerank<TMetadata extends BaseMetadata>(
    query: string,
    documents: Document<TMetadata>[],
    topK = 100,
  ): Promise<Document<TMetadata>[]> {
    if (documents.length === 0) return [];
    if (documents.length === 1) return documents;

    const llm = getAItClient();

    const docsText = documents.map((doc, i) => `[${i}] ${doc.pageContent.slice(0, 200)}`).join("\n\n");

    try {
      const object = await llm.generateStructured<z.infer<typeof RerankSchema>>({
        schema: RerankSchema,
        temperature: 0.3,
        prompt: `Rate the relevance of each document to the query. Score 0-10 where 10 is highly relevant.\n\nQuery: ${query}\n\nDocuments:\n${docsText}\n\nIMPORTANT: Return a valid JSON object with "scores" array containing objects with "index" and "relevance" fields.`,
      });

      const scored = documents.map((doc, i) => ({
        doc,
        score: object.scores.find((s) => s.index === i)?.relevance ?? 0,
      }));

      scored.sort((a, b) => b.score - a.score);

      // Attach rerank scores to documents (normalized to 0-1 range)
      const result = scored.slice(0, topK).map((s) => {
        const doc = s.doc;
        doc.metadata = {
          ...doc.metadata,
          score: s.score / 10, // Normalize 0-10 to 0-1
          rerankScore: s.score,
        };
        return doc;
      });

      console.debug("Reranking completed", {
        inputDocs: documents.length,
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

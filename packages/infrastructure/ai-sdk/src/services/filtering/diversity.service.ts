import { getLogger } from "@ait/core";
import type { DiversityConfig } from "../../types/rag";
import type { Document, BaseMetadata } from "../../types/documents";

const logger = getLogger();

export interface IDiversityService {
  applyMMR<TMetadata extends BaseMetadata>(selectedDocs: Document<TMetadata>[], maxDocs: number): Document<TMetadata>[];
}

export class DiversityService implements IDiversityService {
  private readonly _diversityLambda: number;

  constructor(config: DiversityConfig = {}) {
    this._diversityLambda = Math.min(Math.max(config.diversityLambda ?? 0.7, 0), 1);
  }

  applyMMR<TMetadata extends BaseMetadata>(
    selectedDocs: Document<TMetadata>[],
    maxDocs: number,
  ): Document<TMetadata>[] {
    if (selectedDocs.length <= maxDocs) return selectedDocs;

    const result: Document<TMetadata>[] = [selectedDocs[0]!];
    const remaining = [...selectedDocs];
    remaining.shift();

    const getTokens = (doc: Document<TMetadata>) => new Set(doc.pageContent.toLowerCase().split(/\s+/).slice(0, 100));

    while (result.length < maxDocs && remaining.length > 0) {
      let bestIdx = -1;
      let bestScore = Number.NEGATIVE_INFINITY;

      for (let i = 0; i < remaining.length; i++) {
        const candidateTokens = getTokens(remaining[i]!);

        let maxSim = 0;
        for (const selected of result) {
          const selectedTokens = getTokens(selected);
          const intersection = new Set([...candidateTokens].filter((t) => selectedTokens.has(t)));
          const sim = intersection.size / Math.sqrt(candidateTokens.size * selectedTokens.size);
          maxSim = Math.max(maxSim, sim);
        }

        const relevance = 1 - i / remaining.length;
        const diversity = 1 - maxSim;
        const score = this._diversityLambda * relevance + (1 - this._diversityLambda) * diversity;

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) {
        result.push(remaining[bestIdx]!);
        remaining.splice(bestIdx, 1);
      } else {
        break;
      }
    }

    logger.debug("MMR applied", { before: selectedDocs.length, after: result.length });

    return result;
  }
}

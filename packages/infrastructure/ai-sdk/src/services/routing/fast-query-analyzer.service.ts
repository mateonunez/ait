import type { EntityType } from "@ait/core";
import { VALID_ENTITY_TYPES } from "@ait/core";
import {
  BROAD_QUERY_PATTERNS,
  ENTITY_KEYWORDS,
  GREETING_PATTERNS,
  TECHNICAL_PATTERNS,
  TEMPORAL_PATTERNS,
} from "./fast-query-analyzer.service.const";

/**
 * Query analysis result from fast heuristic-based analysis
 * Replaces expensive LLM-based QueryIntentService for most queries
 */
export interface FastQueryAnalysis {
  entityTypes: EntityType[];
  isTemporalQuery: boolean;
  timeReference?: string;
  primaryFocus: string;
  complexity: "simple" | "moderate" | "complex";
  isBroadQuery: boolean;
  /** True if the query is a greeting or simple conversational message (skip RAG) */
  isGreeting: boolean;
  requiredStyle: "concise" | "technical" | "creative" | "detailed";
}

export interface IFastQueryAnalyzerService {
  analyze(query: string): FastQueryAnalysis;
}

/**
 * Fast, heuristic-based query analyzer
 * Replaces expensive LLM calls with instant regex/keyword matching
 *
 * Performance: < 1ms vs 10-15s for LLM-based analysis
 */
export class FastQueryAnalyzerService implements IFastQueryAnalyzerService {
  analyze(query: string): FastQueryAnalysis {
    const normalizedQuery = query.trim().toLowerCase();
    const words = normalizedQuery.split(/\s+/);

    // Check for greetings FIRST - these skip RAG entirely
    const isGreeting = this._isGreeting(normalizedQuery);

    const entityTypes = this._extractEntityTypes(normalizedQuery);
    const temporalInfo = this._extractTemporalInfo(normalizedQuery);
    const isBroadQuery = isGreeting ? false : this._isBroadQuery(normalizedQuery, entityTypes);
    const complexity = this._determineComplexity(words, entityTypes);
    const requiredStyle = this._determineStyle(normalizedQuery, complexity);
    const primaryFocus = this._extractPrimaryFocus(query, entityTypes, temporalInfo.isTemporalQuery);

    return {
      entityTypes,
      isTemporalQuery: temporalInfo.isTemporalQuery,
      timeReference: temporalInfo.timeReference,
      primaryFocus,
      complexity,
      isBroadQuery,
      isGreeting,
      requiredStyle,
    };
  }

  private _extractEntityTypes(query: string): EntityType[] {
    const detectedTypes = new Set<EntityType>();

    for (const [keyword, types] of Object.entries(ENTITY_KEYWORDS)) {
      // Use word boundary matching for accuracy
      const pattern = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (pattern.test(query)) {
        for (const type of types) {
          detectedTypes.add(type);
        }
      }
    }

    // Filter to only valid entity types (in case config changed)
    const validTypes = Array.from(detectedTypes).filter((type): type is EntityType =>
      VALID_ENTITY_TYPES.includes(type),
    );

    return validTypes;
  }

  private _extractTemporalInfo(query: string): { isTemporalQuery: boolean; timeReference?: string } {
    for (const { pattern, reference } of TEMPORAL_PATTERNS) {
      const match = query.match(pattern);
      if (match) {
        // Replace capture groups in reference
        let timeRef = reference;
        for (let i = 1; i < match.length; i++) {
          timeRef = timeRef.replace(`$${i}`, match[i] ?? "");
        }
        return {
          isTemporalQuery: true,
          timeReference: timeRef.toLowerCase(),
        };
      }
    }

    return { isTemporalQuery: false };
  }

  private _isGreeting(query: string): boolean {
    for (const pattern of GREETING_PATTERNS) {
      if (pattern.test(query)) {
        return true;
      }
    }
    return false;
  }

  private _isBroadQuery(query: string, entityTypes: EntityType[]): boolean {
    // Short queries with no specific entity types are likely broad
    const wordCount = query.split(/\s+/).length;

    if (wordCount <= 3 && entityTypes.length === 0) {
      return true;
    }

    // Check against known broad query patterns
    for (const pattern of BROAD_QUERY_PATTERNS) {
      if (pattern.test(query)) {
        return true;
      }
    }

    return false;
  }

  private _determineComplexity(words: string[], entityTypes: EntityType[]): "simple" | "moderate" | "complex" {
    const wordCount = words.length;
    const entityCount = entityTypes.length;

    // Simple: short queries with single focus
    if (wordCount < 6 && entityCount <= 1) {
      return "simple";
    }

    // Complex: long queries or multi-entity correlation
    if (wordCount > 15 || entityCount >= 3) {
      return "complex";
    }

    // Moderate: everything else
    return "moderate";
  }

  private _determineStyle(
    query: string,
    complexity: "simple" | "moderate" | "complex",
  ): FastQueryAnalysis["requiredStyle"] {
    // Technical queries
    for (const pattern of TECHNICAL_PATTERNS) {
      if (pattern.test(query)) {
        return "technical";
      }
    }

    // Simple queries get concise responses
    if (complexity === "simple") {
      return "concise";
    }

    // Creative patterns
    if (/\b(write|create|generate|brainstorm|ideas?)\b/i.test(query)) {
      return "creative";
    }

    return "detailed";
  }

  private _extractPrimaryFocus(query: string, entityTypes: EntityType[], isTemporalQuery: boolean): string {
    // Extract the core intent from the query
    const cleanQuery = query
      .replace(/^(show|tell|give|get|find|search|list)\s+(me\s+)?(the\s+)?/i, "")
      .replace(/\?$/, "")
      .trim();

    // If we have entity types, make them part of the focus
    if (entityTypes.length > 0) {
      const entityLabel =
        entityTypes.length === 1
          ? (entityTypes[0]?.replace(/_/g, " ") ?? "")
          : `${entityTypes.slice(0, 2).join(", ").replace(/_/g, " ")} and more`;

      if (isTemporalQuery) {
        return `${entityLabel} over time`;
      }

      return cleanQuery || entityLabel;
    }

    return cleanQuery || query;
  }
}

/**
 * Singleton instance for performance
 */
let _instance: FastQueryAnalyzerService | null = null;

export function getFastQueryAnalyzer(): FastQueryAnalyzerService {
  if (!_instance) {
    _instance = new FastQueryAnalyzerService();
  }
  return _instance;
}

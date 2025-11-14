import type { TypeFilter } from "../../types/rag";
import type { QueryIntent } from "../routing/query-intent.service";
import { TemporalDateParser, type ITemporalDateParser } from "./temporal-date-parser.service";
import {
  findEntityTypesByKeywords,
  getEntityTypesByVendor,
  getEntityMetadata,
  VALID_ENTITY_TYPES,
  type EntityType,
} from "@ait/core";

export interface ITypeFilterService {
  inferTypes(
    tags?: string[],
    userQuery?: string,
    options?: { usedFallback?: boolean; intent?: QueryIntent },
  ): TypeFilter | undefined;
}

export class TypeFilterService implements ITypeFilterService {
  private readonly _dateParser: ITemporalDateParser;

  constructor(dateParser?: ITemporalDateParser) {
    this._dateParser = dateParser || new TemporalDateParser();
  }

  inferTypes(
    tags?: string[],
    userQuery?: string,
    options?: { usedFallback?: boolean; intent?: QueryIntent },
  ): TypeFilter | undefined {
    // Prefer intent-derived types and temporal range when available
    if (options?.intent) {
      const timeRange = options.intent.isTemporalQuery
        ? this._parseTimeRange(options.intent.timeReference || userQuery)
        : undefined;

      if (options.intent.entityTypes && options.intent.entityTypes.length > 0) {
        return { types: options.intent.entityTypes, timeRange };
      }

      if (timeRange) {
        return { timeRange };
      }
    }

    // Fallback to keyword-based detection using centralized config
    const keywordSet = this._buildKeywordSet(tags, userQuery);

    if (keywordSet.size === 0) return undefined;

    // Use centralized entity detection
    const keywords = Array.from(keywordSet);
    const matchingTypes = findEntityTypesByKeywords(keywords);

    // Also check for multi-word keywords that might be contained in the query
    // (e.g., "recently played" in "what am I listening to")
    const normalizedQuery = userQuery?.toLowerCase().replace(/[.,;:!?(){}\[\]\\/+*_#@%^&=<>|~]/g, " ") || "";
    const additionalMatchingTypes = this._findTypesByPhraseMatching(normalizedQuery);
    const allMatchingTypes = Array.from(new Set([...matchingTypes, ...additionalMatchingTypes]));

    // If we found specific types, expand to include all types from matching vendors
    // This ensures queries like "repository" also return "pull_request" (both GitHub types)
    if (allMatchingTypes.length > 0) {
      const vendorTypes = new Set<EntityType>(allMatchingTypes);

      // For each matched type, add all other types from the same vendor
      for (const matchedType of allMatchingTypes) {
        const vendor = getEntityMetadata(matchedType).vendor;
        const vendorEntityTypes = getEntityTypesByVendor(vendor);
        for (const vendorType of vendorEntityTypes) {
          vendorTypes.add(vendorType);
        }
      }

      // Sort types according to VALID_ENTITY_TYPES order for consistent output
      const sortedTypes = Array.from(vendorTypes).sort((a, b) => {
        const indexA = VALID_ENTITY_TYPES.indexOf(a);
        const indexB = VALID_ENTITY_TYPES.indexOf(b);
        return indexA - indexB;
      });

      return { types: sortedTypes, timeRange: this._parseTimeRange(userQuery) };
    }

    // Fallback for generic queries - return all entity types
    if (options?.usedFallback && userQuery) {
      return {
        types: [...VALID_ENTITY_TYPES] as EntityType[],
        timeRange: this._parseTimeRange(userQuery),
      };
    }

    return undefined;
  }

  private _parseTimeRange(text?: string): { from?: string; to?: string } | undefined {
    if (!text) return undefined;

    // Delegate to the dedicated temporal date parser
    const result = this._dateParser.parseTimeRange(text);

    return result;
  }

  private _buildKeywordSet(tags?: string[], userQuery?: string): Set<string> {
    const keywords = new Set<string>();

    for (const tag of tags ?? []) {
      if (!tag) continue;
      keywords.add(tag.toLowerCase());
    }

    if (userQuery) {
      // Normalize query: remove punctuation but keep spaces for multi-word keyword matching
      const normalized = userQuery.toLowerCase().replace(/[.,;:!?(){}\[\]\\/+*_#@%^&=<>|~]/g, " ");

      // Add the normalized query as a whole (for multi-word keywords like "recently played")
      keywords.add(normalized.trim());

      // Also add individual tokens (for single-word keywords)
      const tokens = normalized.split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        keywords.add(token);
      }
    }

    return keywords;
  }

  /**
   * Finds entity types by checking if multi-word keywords are contained in the query string.
   * This handles cases like "recently played" keyword matching "what am I listening to" query.
   */
  private _findTypesByPhraseMatching(normalizedQuery: string): EntityType[] {
    const matchingTypes: EntityType[] = [];

    for (const type of VALID_ENTITY_TYPES) {
      const metadata = getEntityMetadata(type);
      // Check if any multi-word keyword (contains space) is contained in the query
      const hasMultiWordMatch = metadata.keywords.some((kw) => {
        if (kw.includes(" ")) {
          // Multi-word keyword - check if it's contained in the query
          return normalizedQuery.includes(kw.toLowerCase());
        }
        return false;
      });

      if (hasMultiWordMatch) {
        matchingTypes.push(type);
      }
    }

    return matchingTypes;
  }
}

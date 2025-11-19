import type { TypeFilter } from "../../types/rag";
import type { QueryIntent } from "../routing/query-intent.service";
import { TemporalDateParser, type ITemporalDateParser } from "./temporal-date-parser.service";
import { TextNormalizationService, type ITextNormalizationService } from "../metadata/text-normalization.service";
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
  private readonly _textNormalizer: ITextNormalizationService;

  constructor(dateParser?: ITemporalDateParser, textNormalizer?: ITextNormalizationService) {
    this._dateParser = dateParser || new TemporalDateParser();
    this._textNormalizer = textNormalizer || new TextNormalizationService();
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

    const keywordSet = this._buildKeywordSet(tags, userQuery);

    if (keywordSet.size === 0) return undefined;

    const keywords = Array.from(keywordSet);
    const matchingTypes = findEntityTypesByKeywords(keywords);

    const normalizedQuery = userQuery ? this._textNormalizer.normalizeForMatching(userQuery) : "";
    const additionalMatchingTypes = this._findTypesByPhraseMatching(normalizedQuery);
    const allMatchingTypes = Array.from(new Set([...matchingTypes, ...additionalMatchingTypes]));

    if (allMatchingTypes.length > 0) {
      const vendorTypes = new Set<EntityType>(allMatchingTypes);

      for (const matchedType of allMatchingTypes) {
        const vendor = getEntityMetadata(matchedType).vendor;
        const vendorEntityTypes = getEntityTypesByVendor(vendor);
        for (const vendorType of vendorEntityTypes) {
          vendorTypes.add(vendorType);
        }
      }

      const sortedTypes = Array.from(vendorTypes).sort((a, b) => {
        const indexA = VALID_ENTITY_TYPES.indexOf(a);
        const indexB = VALID_ENTITY_TYPES.indexOf(b);
        return indexA - indexB;
      });

      return { types: sortedTypes, timeRange: this._parseTimeRange(userQuery) };
    }

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
      const extractedKeywords = this._textNormalizer.extractKeywords(userQuery);
      for (const keyword of extractedKeywords) {
        keywords.add(keyword);
      }
    }

    return keywords;
  }

  private _findTypesByPhraseMatching(normalizedQuery: string): EntityType[] {
    const matchingTypes: EntityType[] = [];

    for (const type of VALID_ENTITY_TYPES) {
      const metadata = getEntityMetadata(type);
      const hasMatch = metadata.keywords.some((kw) => {
        const hasPunctuation = /[.,;:!?(){}\[\]\\/+*_#@%^&=<>|~]/.test(kw);
        const isMultiWord = kw.includes(" ");

        if (!hasPunctuation && !isMultiWord) {
          return false;
        }

        const normalizedKeyword = this._textNormalizer.normalizeForMatching(kw);
        return normalizedKeyword && normalizedQuery.includes(normalizedKeyword);
      });

      if (hasMatch) {
        matchingTypes.push(type);
      }
    }

    return matchingTypes;
  }
}

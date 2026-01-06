import {
  type EntityType,
  VALID_ENTITY_TYPES,
  findEntityTypesByKeywords,
  getEntityMetadata,
  getLogger,
} from "@ait/core";
import type { TypeFilter } from "../../types/rag";
import {
  type ITextNormalizationService,
  TextNormalizationService,
} from "../text-generation/text-normalization.service";
import { type ITemporalDateParser, TemporalDateParser } from "./temporal-date-parser.service";

const logger = getLogger();
const PUNCTUATION_REGEX = /[.,;:!?(){}\[\]\\/+*_#@%^&=<>|~]/;

export interface ITypeFilterService {
  inferTypes(tags?: string[], userQuery?: string, options?: { usedFallback?: boolean }): TypeFilter | undefined;
}

export class TypeFilterService implements ITypeFilterService {
  readonly name = "type-filter";

  private readonly _dateParser: ITemporalDateParser;
  private readonly _textNormalizer: ITextNormalizationService;

  constructor(dateParser?: ITemporalDateParser, textNormalizer?: ITextNormalizationService) {
    this._dateParser = dateParser || new TemporalDateParser();
    this._textNormalizer = textNormalizer || new TextNormalizationService();
  }

  inferTypes(tags?: string[], userQuery?: string, options?: { usedFallback?: boolean }): TypeFilter | undefined {
    const startTime = Date.now();

    const keywordSet = this._buildKeywordSet(tags, userQuery);
    const keywords = Array.from(keywordSet);
    const matchingTypes = findEntityTypesByKeywords(keywords);

    const normalizedQuery = userQuery ? this._textNormalizer.normalizeForMatching(userQuery) : "";
    const additionalMatchingTypes = this._findTypesByPhraseMatching(normalizedQuery);
    const allMatchingTypes = [...matchingTypes, ...additionalMatchingTypes];

    const timeRange = this._parseTimeRange(userQuery);

    if (allMatchingTypes.length > 0) {
      const uniqueTypes = Array.from(new Set(allMatchingTypes));

      const sortedTypes = uniqueTypes.sort((a, b) => {
        const indexA = VALID_ENTITY_TYPES.indexOf(a);
        const indexB = VALID_ENTITY_TYPES.indexOf(b);
        return indexA - indexB;
      });

      const result = { types: sortedTypes, timeRange };

      this._logCompletion(startTime, {
        source: "keyword-matching",
        types: sortedTypes,
        hasTimeRange: !!timeRange,
        keywordCount: keywords.length,
        query: userQuery?.slice(0, 50),
      });

      return result;
    }

    if (timeRange) {
      this._logCompletion(startTime, {
        source: "temporal-only",
        types: [],
        hasTimeRange: true,
        keywordCount: keywords.length,
        query: userQuery?.slice(0, 50),
      });
      return { types: [], timeRange };
    }

    logger.debug(`Service [${this.name}] no filter inferred`, {
      reason: "no-matching-types-or-dates",
      keywordCount: keywords.length,
      query: userQuery?.slice(0, 50),
    });

    return undefined;
  }

  private _logCompletion(
    startTime: number,
    data: { source: string; types: EntityType[]; hasTimeRange: boolean; keywordCount?: number; query?: string },
  ): void {
    const duration = Date.now() - startTime;
    logger.debug(`Service [${this.name}] completed`, {
      ...data,
      typeCount: data.types.length,
      duration,
    });
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
        const hasPunctuation = PUNCTUATION_REGEX.test(kw);
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

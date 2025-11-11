import type { TypeFilter } from "../../types/rag";
import type { QueryIntent } from "../routing/query-intent.service";
import { TemporalDateParser, type ITemporalDateParser } from "./temporal-date-parser.service";

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
        console.info("Using entity types from LLM intent", {
          entityTypes: options.intent.entityTypes,
          entityCount: options.intent.entityTypes.length,
        });
        return { types: options.intent.entityTypes, timeRange };
      }

      if (timeRange) {
        return { timeRange };
      }
    }

    // Fallback to keyword-based detection
    const keywordSet = this._buildKeywordSet(tags, userQuery);

    if (keywordSet.size === 0) return undefined;

    // Collect all matching type categories
    const allTypes: string[] = [];

    // Check all domains and accumulate matching types
    const hasTweets = this._hasAny(keywordSet, ["tweet", "microblog", "twitter", "x.com", "x", "posted", "retweeted"]);
    const hasCode = this._hasAny(keywordSet, [
      "repo",
      "repository",
      "source",
      "code",
      "pull",
      "pr",
      "git",
      "github",
      "commit",
    ]);
    const hasTasks = this._hasAny(keywordSet, ["task", "issue", "ticket", "project", "kanban", "bug", "linear"]);
    const hasMusic = this._hasAny(keywordSet, [
      "music",
      "song",
      "track",
      "playlist",
      "artist",
      "album",
      "listening",
      "spotify",
      "playing",
      "played",
    ]);

    if (hasTweets) {
      allTypes.push("tweet");
    }

    if (hasCode) {
      allTypes.push("repository", "pull_request");
    }

    if (hasTasks) {
      allTypes.push("issue");
    }

    if (hasMusic) {
      allTypes.push("track", "artist", "playlist", "album", "recently_played");
    }

    // If we found specific types, return them
    if (allTypes.length > 0) {
      return { types: allTypes, timeRange: this._parseTimeRange(userQuery) };
    }

    // Fallback for generic queries
    if (options?.usedFallback && userQuery) {
      return {
        types: [
          "repository",
          "pull_request",
          "issue",
          "track",
          "artist",
          "playlist",
          "album",
          "recently_played",
          "tweet",
        ],
        timeRange: this._parseTimeRange(userQuery),
      };
    }

    return undefined;
  }

  private _parseTimeRange(text?: string): { from?: string; to?: string } | undefined {
    if (!text) return undefined;

    // Delegate to the dedicated temporal date parser
    const result = this._dateParser.parseTimeRange(text);

    if (result) {
      console.info("Time range parsed for filtering", {
        input: text.slice(0, 50),
        from: result.from,
        to: result.to,
      });
    }

    return result;
  }

  private _buildKeywordSet(tags?: string[], userQuery?: string): Set<string> {
    const keywords = new Set<string>();

    for (const tag of tags ?? []) {
      if (!tag) continue;
      keywords.add(tag.toLowerCase());
    }

    if (userQuery) {
      const tokens = userQuery
        .toLowerCase()
        .replace(/[.,;:!?(){}\[\]\\/+*_#@%^&=<>|~]/g, " ")
        .split(/\s+/)
        .filter(Boolean);

      for (const token of tokens) {
        keywords.add(token);
      }
    }

    return keywords;
  }

  private _hasAny(keywordSet: Set<string>, keywords: string[]): boolean {
    return keywords.some((kw) => keywordSet.has(kw));
  }
}

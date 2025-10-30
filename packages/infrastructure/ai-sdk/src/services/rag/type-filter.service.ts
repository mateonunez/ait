import type { TypeFilter } from "../../types/rag";
import type { QueryIntent } from "./query-intent.service";

export interface ITypeFilterService {
  inferTypes(
    tags?: string[],
    userQuery?: string,
    options?: { usedFallback?: boolean; intent?: QueryIntent },
  ): TypeFilter | undefined;
}

export class TypeFilterService implements ITypeFilterService {
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
    const now = new Date();

    const lower = text.toLowerCase();

    const setFromHoursAgo = (hours: number) => ({ from: new Date(now.getTime() - hours * 3600000).toISOString() });
    const setFromDaysAgo = (days: number) => ({ from: new Date(now.getTime() - days * 86400000).toISOString() });

    // Common phrases
    if (lower.includes("last 24 hours") || lower.includes("past 24 hours")) return setFromHoursAgo(24);
    if (lower.includes("last 48 hours") || lower.includes("past 48 hours")) return setFromHoursAgo(48);
    if (lower.includes("last few days") || lower.includes("past few days")) return setFromDaysAgo(3);
    if (lower.includes("last week") || lower.includes("past week")) return setFromDaysAgo(7);
    if (lower.includes("last 7 days") || lower.includes("past 7 days")) return setFromDaysAgo(7);
    if (lower.includes("last 3 days") || lower.includes("past 3 days")) return setFromDaysAgo(3);
    if (lower.includes("today")) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    if (lower.includes("yesterday")) {
      const start = new Date(now);
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { from: start.toISOString(), to: end.toISOString() };
    }

    // Try to parse explicit dates like "october 30" or ISO
    const dateMatch = lower.match(
      /\b(?:\d{4}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?)\b/i,
    );
    if (dateMatch) {
      const parsed = new Date(dateMatch[0]);
      if (!Number.isNaN(parsed.getTime())) {
        const start = new Date(parsed);
        start.setHours(0, 0, 0, 0);
        const end = new Date(parsed);
        end.setHours(23, 59, 59, 999);
        return { from: start.toISOString(), to: end.toISOString() };
      }
    }

    return undefined;
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

import type { EntityType } from "@ait/core";
import { VALID_ENTITY_TYPES } from "@ait/core";

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
  requiredStyle: "concise" | "technical" | "creative" | "detailed";
}

export interface IFastQueryAnalyzerService {
  analyze(query: string): FastQueryAnalysis;
}

/**
 * Keyword patterns for entity type detection
 * Maps keywords to their corresponding entity types
 */
const ENTITY_KEYWORDS: Record<string, EntityType[]> = {
  // Spotify
  song: ["track"],
  songs: ["track"],
  track: ["track"],
  tracks: ["track"],
  music: ["track", "artist", "album", "playlist"],
  listening: ["recently_played"],
  listened: ["recently_played"],
  played: ["recently_played"],
  playing: ["recently_played"],
  artist: ["artist"],
  artists: ["artist"],
  album: ["album"],
  albums: ["album"],
  playlist: ["playlist"],
  playlists: ["playlist"],
  spotify: ["track", "artist", "album", "playlist", "recently_played"],

  // GitHub
  repo: ["repository"],
  repos: ["repository"],
  repository: ["repository"],
  repositories: ["repository"],
  code: ["repository", "pull_request"],
  commit: ["repository"],
  commits: ["repository"],
  pr: ["pull_request"],
  prs: ["pull_request"],
  "pull request": ["pull_request"],
  "pull requests": ["pull_request"],
  merge: ["pull_request"],
  branch: ["repository"],
  github: ["repository", "pull_request"],

  // Linear
  task: ["issue"],
  tasks: ["issue"],
  issue: ["issue"],
  issues: ["issue"],
  ticket: ["issue"],
  tickets: ["issue"],
  project: ["issue"],
  projects: ["issue"],
  linear: ["issue"],
  backlog: ["issue"],
  sprint: ["issue"],

  // X/Twitter
  tweet: ["tweet"],
  tweets: ["tweet"],
  twitter: ["tweet"],
  posted: ["tweet"],
  x: ["tweet"],

  // Notion
  note: ["page"],
  notes: ["page"],
  page: ["page"],
  pages: ["page"],
  document: ["page"],
  documents: ["page"],
  notion: ["page"],
  wiki: ["page"],
  docs: ["page"],

  // Slack
  slack: ["message"],
  channel: ["message"],
  message: ["message"],
  messages: ["message"],
  team: ["message"],
};

/**
 * Temporal patterns for detecting time-related queries
 */
const TEMPORAL_PATTERNS: Array<{ pattern: RegExp; reference: string }> = [
  { pattern: /\b(today|tonight)\b/i, reference: "today" },
  { pattern: /\byesterday\b/i, reference: "yesterday" },
  { pattern: /\blast\s+(week|month|year)\b/i, reference: "last $1" },
  { pattern: /\bthis\s+(week|month|year)\b/i, reference: "this $1" },
  { pattern: /\b(\d+)\s+(day|week|month|year)s?\s+ago\b/i, reference: "$1 $2 ago" },
  { pattern: /\brecently?\b/i, reference: "recent" },
  { pattern: /\blast\s+(\d+)\s+(day|hour|minute)s?\b/i, reference: "last $1 $2" },
  { pattern: /\b(morning|afternoon|evening|night)\b/i, reference: "today" },
  { pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, reference: "$1" },
  {
    pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    reference: "$1",
  },
];

/**
 * Patterns that indicate broad/ambiguous queries
 */
const BROAD_QUERY_PATTERNS: RegExp[] = [
  /^(what|who|how)\s+(are|is)\s+(you|ait|this)/i,
  /^(tell|show)\s+me\s+(about\s+)?(yourself|you|everything)/i,
  /^(hello|hi|hey|help)/i,
  /^what\s+can\s+you\s+do/i,
  /^(give|show)\s+me\s+(an?\s+)?overview/i,
  /^summarize\s+(everything|all|my\s+data)/i,
];

/**
 * Patterns for technical queries
 */
const TECHNICAL_PATTERNS: RegExp[] = [
  /\b(debug|fix|error|bug|issue|problem)\b/i,
  /\b(code|function|class|method|api|endpoint)\b/i,
  /\b(implement|refactor|optimize|performance)\b/i,
  /\b(test|spec|unit|integration)\b/i,
];

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

    const entityTypes = this._extractEntityTypes(normalizedQuery);
    const temporalInfo = this._extractTemporalInfo(normalizedQuery);
    const isBroadQuery = this._isBroadQuery(normalizedQuery, entityTypes);
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

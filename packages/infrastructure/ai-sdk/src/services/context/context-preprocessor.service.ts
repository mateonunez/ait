import { getLogger } from "@ait/core";
import type { RetrievedDocument } from "../../rag/retrieve";

const logger = getLogger();

/**
 * Temporal intent direction for filtering documents
 */
export type TemporalIntent = "future" | "past" | "today" | "all";

/**
 * Options for context preprocessing
 */
export interface ContextPreprocessorOptions {
  documents: RetrievedDocument[];
  query: string;
  temporalIntent?: TemporalIntent;
}

/**
 * Result of context preprocessing
 */
export interface ContextPreprocessorResult {
  documents: RetrievedDocument[];
  filtered: number;
  kept: number;
  temporalIntent: TemporalIntent;
}

/**
 * Timestamp field names to look for in document metadata
 */
const TIMESTAMP_METADATA_FIELDS = [
  "startTime", // calendar events
  "endTime", // calendar events
  "createdAt",
  "updatedAt",
  "playedAt", // spotify
  "publishedAt", // youtube
  "mergedAt", // github PR
  "pushedAt", // github repo
  "authorDate", // github commit
  "committerDate", // github commit
  "timestamp",
  "date",
] as const;

/**
 * Keywords that indicate temporal intent
 */
const TEMPORAL_KEYWORDS: Record<TemporalIntent, readonly string[]> = {
  future: [
    // English
    "upcoming",
    "next",
    "scheduled",
    "future",
    "tomorrow",
    "planning",
    "will",
    "going to",
    // Italian
    "prossimo",
    "prossima",
    "prossimi",
    "prossime",
    "futuro",
    "domani",
    "programmato",
    "programmata",
    // Spanish
    "próximo",
    "próxima",
    "próximos",
    "próximas",
    "futuro",
    "mañana",
    "programado",
    "programada",
  ],
  past: [
    // English
    "past",
    "previous",
    "last",
    "yesterday",
    "history",
    "did",
    "was",
    "were",
    "ago",
    // Italian
    "passato",
    "passata",
    "scorso",
    "scorsa",
    "ieri",
    "storia",
    "fatto",
    "era",
    "erano",
    "fa",
    // Spanish
    "pasado",
    "pasada",
    "anterior",
    "ayer",
    "historial",
    "hice",
    "era",
    "eran",
    "hace",
  ],
  today: [
    // English
    "today",
    "now",
    "current",
    "this moment",
    // Italian
    "oggi",
    "adesso",
    "ora",
    "attuale",
    // Spanish
    "hoy",
    "ahora",
    "actual",
    "en este momento",
  ],
  all: [], // No keywords, indicates no temporal filtering
};

export interface IContextPreprocessorService {
  /**
   * Detect temporal intent from a query string
   */
  detectTemporalIntent(query: string): TemporalIntent;

  /**
   * Filter documents based on temporal intent
   */
  filter(options: ContextPreprocessorOptions): ContextPreprocessorResult;
}

export class ContextPreprocessorService implements IContextPreprocessorService {
  readonly name = "context-preprocessor";

  /**
   * Detect temporal intent from query keywords
   */
  detectTemporalIntent(query: string): TemporalIntent {
    const normalizedQuery = query.toLowerCase();

    // Check for future keywords
    if (TEMPORAL_KEYWORDS.future.some((kw) => normalizedQuery.includes(kw.toLowerCase()))) {
      return "future";
    }

    // Check for past keywords
    if (TEMPORAL_KEYWORDS.past.some((kw) => normalizedQuery.includes(kw.toLowerCase()))) {
      return "past";
    }

    // Check for today keywords
    if (TEMPORAL_KEYWORDS.today.some((kw) => normalizedQuery.includes(kw.toLowerCase()))) {
      return "today";
    }

    return "all";
  }

  /**
   * Filter documents based on temporal intent
   */
  filter(options: ContextPreprocessorOptions): ContextPreprocessorResult {
    const { documents, query } = options;
    const temporalIntent = options.temporalIntent ?? this.detectTemporalIntent(query);

    // No filtering needed
    if (temporalIntent === "all" || documents.length === 0) {
      logger.debug(`[${this.name}] No temporal filtering needed`, {
        temporalIntent,
        documentCount: documents.length,
      });
      return {
        documents,
        filtered: 0,
        kept: documents.length,
        temporalIntent,
      };
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const filtered: RetrievedDocument[] = [];
    let droppedCount = 0;

    for (const doc of documents) {
      const docDate = this._extractDate(doc);

      // Debug logging for each document
      logger.debug(`[${this.name}] Processing document`, {
        docId: doc.id,
        hasMetadata: !!doc.metadata,
        metadataKeys: doc.metadata ? Object.keys(doc.metadata).join(", ") : "none",
        extractedDate: docDate?.toISOString() ?? "null",
        temporalIntent,
      });

      // If we can't extract a date, keep the document (don't filter it out)
      if (!docDate) {
        filtered.push(doc);
        continue;
      }

      const shouldKeep = this._matchesTemporalIntent(docDate, temporalIntent, todayStart, todayEnd, now);

      logger.debug(`[${this.name}] Date comparison`, {
        docId: doc.id,
        docDate: docDate.toISOString(),
        now: now.toISOString(),
        intent: temporalIntent,
        shouldKeep,
        comparison:
          temporalIntent === "future"
            ? `${docDate.getTime()} > ${now.getTime()}`
            : `${docDate.getTime()} < ${now.getTime()}`,
      });

      if (shouldKeep) {
        filtered.push(doc);
      } else {
        droppedCount++;
      }
    }

    logger.info(`[${this.name}] Documents preprocessed`, {
      originalCount: documents.length,
      keptCount: filtered.length,
      droppedCount,
      temporalIntent,
      now: now.toISOString().split("T")[0],
    });

    return {
      documents: filtered,
      filtered: droppedCount,
      kept: filtered.length,
      temporalIntent,
    };
  }

  /**
   * Extract the most relevant date from document metadata
   */
  private _extractDate(doc: RetrievedDocument): Date | null {
    const metadata = doc.metadata;
    if (!metadata) return null;

    for (const field of TIMESTAMP_METADATA_FIELDS) {
      const value = metadata[field];
      if (value) {
        const date = this._parseDate(value);
        if (date) return date;
      }
    }

    return null;
  }

  /**
   * Parse various date formats
   */
  private _parseDate(value: unknown): Date | null {
    if (!value) return null;

    try {
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
      }

      if (typeof value === "string" || typeof value === "number") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if a date matches the temporal intent
   */
  private _matchesTemporalIntent(
    docDate: Date,
    intent: TemporalIntent,
    todayStart: Date,
    todayEnd: Date,
    now: Date,
  ): boolean {
    switch (intent) {
      case "future":
        // Document date is in the future (after now)
        return docDate.getTime() > now.getTime();

      case "past":
        // Document date is in the past (before now)
        return docDate.getTime() < now.getTime();

      case "today":
        // Document date is today
        return docDate.getTime() >= todayStart.getTime() && docDate.getTime() <= todayEnd.getTime();
      default:
        return true;
    }
  }
}

/**
 * Singleton instance
 */
let _instance: ContextPreprocessorService | null = null;

export function getContextPreprocessorService(): ContextPreprocessorService {
  if (!_instance) {
    _instance = new ContextPreprocessorService();
  }
  return _instance;
}

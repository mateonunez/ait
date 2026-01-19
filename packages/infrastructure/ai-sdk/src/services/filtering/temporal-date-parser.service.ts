import { getLogger } from "@ait/core";
import * as chrono from "chrono-node";

const logger = getLogger();

export interface DateRange {
  from?: string;
  to?: string;
}

export interface ITemporalDateParser {
  parseDate(value: unknown): Date | null;
  parseTimeRange(text: string): DateRange | undefined;
}

const ITALIAN_MONTHS: Record<string, string> = {
  gennaio: "january",
  febbraio: "february",
  marzo: "march",
  aprile: "april",
  maggio: "may",
  giugno: "june",
  luglio: "july",
  agosto: "august",
  settembre: "september",
  ottobre: "october",
  novembre: "november",
  dicembre: "december",
};

const SPANISH_MONTHS: Record<string, string> = {
  enero: "january",
  febrero: "february",
  marzo: "march",
  abril: "april",
  mayo: "may",
  junio: "june",
  julio: "july",
  agosto: "august",
  septiembre: "september",
  octubre: "october",
  noviembre: "november",
  diciembre: "december",
};

const MONTH_TRANSLATIONS = [ITALIAN_MONTHS, SPANISH_MONTHS];

// Pattern Registry for temporal parsing
interface TemporalPattern {
  regex: RegExp;
  handler: (match: RegExpExecArray, now: Date) => DateRange;
}

const UNIT_MAP: Record<string, "day" | "week" | "month" | "year"> = {
  // English
  day: "day",
  days: "day",
  week: "week",
  weeks: "week",
  month: "month",
  months: "month",
  year: "year",
  years: "year",
  // Italian
  giorno: "day",
  giorni: "day",
  settimana: "week",
  settimane: "week",
  mese: "month",
  mesi: "month",
  anno: "year",
  anni: "year",
  // Spanish
  día: "day",
  días: "day",
  semana: "week",
  semanas: "week",
  mes: "month",
  meses: "month",
  año: "year",
  años: "year",
};

const RECENCY_KEYWORDS = [
  // English
  "latest",
  "recent",
  "recently",
  "newest",
  "most recent",
  // Italian
  "ultime",
  "ultimi",
  "ultima",
  "ultimo",
  "recente",
  "recenti",
  "più recente",
  "più recenti",
  // Spanish
  "últimas",
  "últimos",
  "última",
  "último",
  "reciente",
  "recientes",
  "más reciente",
  "más recientes",
];

export class TemporalDateParser implements ITemporalDateParser {
  readonly name = "temporal-date-parser";

  private readonly _patternRegistry: TemporalPattern[] = [
    // Pattern: "last/past X units" (e.g., "last 2 months", "ultimi 3 giorni")
    {
      regex: /\b(?:last|past|ultimi|ultime|scorsi|scorse|ultimos|ultimas|pasados|pasadas)\s+(\d+)\s+([a-zàéíóú]+\b)/i,
      handler: (match, now) => {
        const amountStr = match[1];
        const unitLabel = match[2]?.toLowerCase();
        if (!amountStr || !unitLabel) return {};

        const amount = Number.parseInt(amountStr, 10);
        const unit = UNIT_MAP[unitLabel];

        if (!unit) return {};

        const from = new Date(now);
        if (unit === "day") from.setDate(now.getDate() - amount);
        if (unit === "week") from.setDate(now.getDate() - amount * 7);
        if (unit === "month") from.setMonth(now.getMonth() - amount);
        if (unit === "year") from.setFullYear(now.getFullYear() - amount);

        from.setHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setHours(23, 59, 59, 999);

        return { from: from.toISOString(), to: to.toISOString() };
      },
    },
    // Pattern: "last/past unit" (e.g., "last month", "mese scorso")
    {
      regex: /\b(?:last|past|scorso|scorsa|pasado|pasada|ultimo|ultima)\s+([a-zàéíóú]+\b)/i,
      handler: (match, now) => {
        const unitLabel = match[1]?.toLowerCase();
        if (!unitLabel) return {};
        const unit = UNIT_MAP[unitLabel];
        if (!unit) return {};

        const from = new Date(now);
        if (unit === "day") from.setDate(now.getDate() - 1);
        if (unit === "week") from.setDate(now.getDate() - 7);
        if (unit === "month") from.setMonth(now.getMonth() - 1);
        if (unit === "year") from.setFullYear(now.getFullYear() - 1);

        from.setHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setHours(23, 59, 59, 999);
        return { from: from.toISOString(), to: to.toISOString() };
      },
    },
    // Pattern: "unit scorso/a" (Italian style: "mese scorso")
    {
      regex: /\b([a-zàéíóú]+\s+)(?:scorso|scorsa|pasado|pasada)\b/i,
      handler: (match, now) => {
        const unitLabel = match[1]?.trim().toLowerCase();
        if (!unitLabel) return {};
        const unit = UNIT_MAP[unitLabel];
        if (!unit) return {};

        const from = new Date(now);
        if (unit === "day") from.setDate(now.getDate() - 1);
        if (unit === "week") from.setDate(now.getDate() - 7);
        if (unit === "month") from.setMonth(now.getMonth() - 1);
        if (unit === "year") from.setFullYear(now.getFullYear() - 1);

        from.setHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setHours(23, 59, 59, 999);
        return { from: from.toISOString(), to: to.toISOString() };
      },
    },
    // Pattern: "today/tomorrow/yesterday"
    {
      regex: /\b(today|oggi|hoy|tomorrow|domani|mañana|yesterday|ieri|ayer)\b/i,
      handler: (match, now) => {
        const term = match[1]?.toLowerCase();
        if (!term) return {};
        const target = new Date(now);

        if (/\b(tomorrow|domani|mañana)\b/i.test(term)) target.setDate(now.getDate() + 1);
        if (/\b(yesterday|ieri|ayer)\b/i.test(term)) target.setDate(now.getDate() - 1);

        const from = new Date(target);
        from.setHours(0, 0, 0, 0);
        const to = new Date(target);
        to.setHours(23, 59, 59, 999);
        return { from: from.toISOString(), to: to.toISOString() };
      },
    },
    // Pattern: "latest/recent/ultime" (implicit recency, defaults to last 7 days)
    {
      regex: new RegExp(`\\b(${RECENCY_KEYWORDS.join("|")})\\b`, "i"),
      handler: (_match, now) => {
        // "Latest/recent" implies last 7 days as a reasonable default
        const from = new Date(now);
        from.setDate(now.getDate() - 7);
        from.setHours(0, 0, 0, 0);

        const to = new Date(now);
        to.setHours(23, 59, 59, 999);

        return { from: from.toISOString(), to: to.toISOString() };
      },
    },
  ];

  parseDate(value: unknown): Date | null {
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

  parseTimeRange(text: string): DateRange | undefined {
    if (!text) return undefined;

    const startTime = Date.now();
    const normalizedText = this._normalizeMonthNames(text);

    // 1. Try Pattern Registry (Scalable regex-based parsing)
    for (const pattern of this._patternRegistry) {
      const match = pattern.regex.exec(normalizedText);
      if (match) {
        const range = pattern.handler(match, new Date());
        if (range.from || range.to) {
          const duration = Date.now() - startTime;
          logger.debug(`Service [${this.name}] parsed via registry`, {
            text: text.slice(0, 50),
            pattern: pattern.regex.toString(),
            from: range.from?.slice(0, 19),
            duration,
          });
          return range;
        }
      }
    }

    try {
      const results = chrono.parse(normalizedText, new Date(), { forwardDate: false });

      if (!results || results.length === 0) {
        logger.debug(`Service [${this.name}] no temporal pattern found`, {
          text: text.slice(0, 50),
        });
        return undefined;
      }

      if (results.length >= 2) {
        const validResults = results.filter((r): r is chrono.ParsedResult => !!r.start?.date());
        const dates = validResults.map((r) => r.start.date()).sort((a, b) => a.getTime() - b.getTime());

        const firstDate = dates[0];
        const lastDate = dates[dates.length - 1];
        const firstResult = validResults[0];
        const lastResult = validResults[validResults.length - 1];

        if (firstDate && lastDate && firstResult && lastResult) {
          const from = this._expandToStartOfPeriod(firstDate, firstResult);
          const to = this._expandToEndOfPeriod(lastDate, lastResult);

          const result = {
            from: from.toISOString(),
            to: to.toISOString(),
          };

          const duration = Date.now() - startTime;
          logger.debug(`Service [${this.name}] parsed multi-date range`, {
            text: text.slice(0, 50),
            from: result.from.slice(0, 19),
            to: result.to.slice(0, 19),
            resultCount: results.length,
            duration,
          });

          return result;
        }
      }

      const result = results[0];
      if (!result) return undefined;

      const startDate = result.start?.date();
      if (!startDate) return undefined;

      const endDate = result.end?.date();

      const range: DateRange = endDate
        ? {
            from: this._expandToStartOfPeriod(startDate, result).toISOString(),
            to: this._expandToEndOfPeriod(endDate, result).toISOString(),
          }
        : {
            from: this._expandToStartOfPeriod(startDate, result).toISOString(),
            to: this._expandToEndOfPeriod(startDate, result).toISOString(),
          };

      const duration = Date.now() - startTime;
      logger.debug(`Service [${this.name}] parsed single date (chrono)`, {
        text: text.slice(0, 50),
        from: range.from?.slice(0, 19),
        to: range.to?.slice(0, 19),
        hasEndDate: !!endDate,
        duration,
      });

      return range;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.warn(`Service [${this.name}] parsing failed`, {
        error: error instanceof Error ? error.message : String(error),
        text: text.slice(0, 50),
        duration,
      });
      return undefined;
    }
  }

  /**
   * Get start of week (Monday) for a given date
   */
  private _getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private _normalizeMonthNames(text: string): string {
    let normalized = text.toLowerCase();

    for (const monthMap of MONTH_TRANSLATIONS) {
      for (const [localMonth, englishMonth] of Object.entries(monthMap)) {
        normalized = normalized.replace(new RegExp(`\\b${localMonth}\\b`, "gi"), englishMonth);
      }
    }

    return normalized;
  }

  private _expandToStartOfPeriod(date: Date, result: chrono.ParsedResult): Date {
    const expanded = new Date(date);

    if (result.start?.isCertain("month") && !result.start?.isCertain("day")) {
      expanded.setDate(1);
      expanded.setHours(0, 0, 0, 0);
      return expanded;
    }

    expanded.setHours(0, 0, 0, 0);
    return expanded;
  }

  private _expandToEndOfPeriod(date: Date, result: chrono.ParsedResult): Date {
    const expanded = new Date(date);

    if (result.start?.isCertain("month") && !result.start?.isCertain("day")) {
      expanded.setMonth(expanded.getMonth() + 1);
      expanded.setDate(0); // Last day of previous month
      expanded.setHours(23, 59, 59, 999);
      return expanded;
    }

    expanded.setHours(23, 59, 59, 999);
    return expanded;
  }
}

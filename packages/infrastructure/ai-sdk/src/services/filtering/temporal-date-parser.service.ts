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

export class TemporalDateParser implements ITemporalDateParser {
  readonly name = "temporal-date-parser";

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

    // Handle period patterns (day/week/month/year) explicitly before chrono
    const periodRange = this._parsePeriodPattern(normalizedText);
    if (periodRange) {
      const duration = Date.now() - startTime;
      logger.debug(`Service [${this.name}] parsed period pattern`, {
        text: text.slice(0, 50),
        from: periodRange.from?.slice(0, 19),
        to: periodRange.to?.slice(0, 19),
        duration,
      });
      return periodRange;
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
      logger.debug(`Service [${this.name}] parsed single date`, {
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
   * Parse period-related patterns that chrono doesn't handle well
   * Handles day/week/month/year patterns with proper date ranges
   */
  private _parsePeriodPattern(text: string): DateRange | undefined {
    const lowerText = text.toLowerCase();
    const now = new Date();

    // === DAY PATTERNS ===

    // "today" - current day
    if (/\b(today|oggi|hoy)\b/i.test(lowerText)) {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return { from: startOfDay.toISOString(), to: endOfDay.toISOString() };
    }

    // "tomorrow" - next day
    if (/\b(tomorrow|domani|mañana)\b/i.test(lowerText)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfDay = new Date(tomorrow);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(tomorrow);
      endOfDay.setHours(23, 59, 59, 999);
      return { from: startOfDay.toISOString(), to: endOfDay.toISOString() };
    }

    // "yesterday" - previous day
    if (/\b(yesterday|ieri|ayer)\b/i.test(lowerText)) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfDay = new Date(yesterday);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(yesterday);
      endOfDay.setHours(23, 59, 59, 999);
      return { from: startOfDay.toISOString(), to: endOfDay.toISOString() };
    }

    // === WEEK PATTERNS ===

    // "this week" - current calendar week (Monday to Sunday)
    if (/\b(this\s+week|current\s+week|questa\s+settimana)\b/i.test(lowerText)) {
      const monday = this._getStartOfWeek(now);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { from: monday.toISOString(), to: sunday.toISOString() };
    }

    // "last week" - previous calendar week
    if (/\b(last\s+week|previous\s+week|scorsa\s+settimana)\b/i.test(lowerText)) {
      const lastMonday = this._getStartOfWeek(now);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);
      return { from: lastMonday.toISOString(), to: lastSunday.toISOString() };
    }

    // "past week" / "last 7 days" - rolling 7 days
    if (/\b(past\s+week|last\s+7\s+days|past\s+7\s+days|ultimi\s+7\s+giorni)\b/i.test(lowerText)) {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      const today = new Date(now);
      today.setHours(23, 59, 59, 999);
      return { from: weekAgo.toISOString(), to: today.toISOString() };
    }

    // === MONTH PATTERNS ===

    // "this month" - 1st to end of current month
    if (/\b(this\s+month|current\s+month|questo\s+mese)\b/i.test(lowerText)) {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { from: firstDay.toISOString(), to: lastDay.toISOString() };
    }

    // "last month" - previous calendar month
    if (/\b(last\s+month|previous\s+month|scorso\s+mese|mese\s+scorso)\b/i.test(lowerText)) {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: firstDay.toISOString(), to: lastDay.toISOString() };
    }

    // "past month" / "last 30 days" - rolling 30 days
    if (/\b(past\s+month|last\s+30\s+days|past\s+30\s+days|ultimi\s+30\s+giorni)\b/i.test(lowerText)) {
      const monthAgo = new Date(now);
      monthAgo.setDate(now.getDate() - 30);
      monthAgo.setHours(0, 0, 0, 0);
      const today = new Date(now);
      today.setHours(23, 59, 59, 999);
      return { from: monthAgo.toISOString(), to: today.toISOString() };
    }

    // === YEAR PATTERNS ===

    // "this year" - Jan 1 to Dec 31 of current year
    if (/\b(this\s+year|current\s+year|quest'anno|questo\s+anno)\b/i.test(lowerText)) {
      const firstDay = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { from: firstDay.toISOString(), to: lastDay.toISOString() };
    }

    // "last year" - previous calendar year
    if (/\b(last\s+year|previous\s+year|anno\s+scorso|l'anno\s+scorso)\b/i.test(lowerText)) {
      const firstDay = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { from: firstDay.toISOString(), to: lastDay.toISOString() };
    }

    // "past year" / "last 365 days" - rolling 365 days
    if (/\b(past\s+year|last\s+365\s+days|last\s+12\s+months|ultimi\s+12\s+mesi)\b/i.test(lowerText)) {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(now.getFullYear() - 1);
      yearAgo.setHours(0, 0, 0, 0);
      const today = new Date(now);
      today.setHours(23, 59, 59, 999);
      return { from: yearAgo.toISOString(), to: today.toISOString() };
    }

    return undefined;
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

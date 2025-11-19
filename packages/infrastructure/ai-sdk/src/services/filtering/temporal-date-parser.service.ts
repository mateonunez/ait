import * as chrono from "chrono-node";

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

    const normalizedText = this._normalizeMonthNames(text);

    try {
      const results = chrono.parse(normalizedText, new Date(), { forwardDate: false });

      if (!results || results.length === 0) return undefined;

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

          return {
            from: from.toISOString(),
            to: to.toISOString(),
          };
        }
      }

      const result = results[0];
      if (!result) return undefined;

      const startDate = result.start?.date();
      if (!startDate) return undefined;

      const endDate = result.end?.date();

      if (endDate) {
        return {
          from: this._expandToStartOfPeriod(startDate, result).toISOString(),
          to: this._expandToEndOfPeriod(endDate, result).toISOString(),
        };
      }

      return {
        from: this._expandToStartOfPeriod(startDate, result).toISOString(),
        to: this._expandToEndOfPeriod(startDate, result).toISOString(),
      };
    } catch (error) {
      console.warn("Date parsing failed", {
        error: error instanceof Error ? error.message : String(error),
        text: text.slice(0, 50),
      });
      return undefined;
    }
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

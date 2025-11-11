// biome-ignore lint/complexity/noStaticOnlyClass: We want to keep this class static
export class TextSanitizer {
  public static sanitize(text: string | null | undefined, maxLength = 500): string {
    if (!text) return "";

    let sanitized = text
      // Remove control characters except newline and tab
      // biome-ignore lint/suspicious/noControlCharactersInRegex: we want to remove all control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
      // Replace problematic Unicode replacement characters
      .replace(/[\uFFFD\uFFFE\uFFFF]/g, "")
      // Remove backslashes that could create malformed escape sequences
      .replace(/\\/g, "/")
      // Normalize mathematical alphanumeric symbols to ASCII (U+1D400-U+1D7FF)
      // This handles fancy monospace text like 𝚗𝚙𝚖 → npm
      .replace(/[\u{1D400}-\u{1D7FF}]/gu, (char) => {
        const code = char.codePointAt(0) || 0;
        // Map mathematical monospace to regular ASCII
        if (code >= 0x1d670 && code <= 0x1d689) return String.fromCharCode(code - 0x1d670 + 65); // A-Z
        if (code >= 0x1d68a && code <= 0x1d6a3) return String.fromCharCode(code - 0x1d68a + 97); // a-z
        return "";
      })
      // Remove any remaining problematic Unicode (emoji, symbols that could cause issues)
      .replace(/[\u{1F000}-\u{1F9FF}]/gu, "") // Emoji and symbols
      .replace(/[\u{2000}-\u{206F}]/gu, " ") // Various spaces and formatting marks
      // Replace multiple whitespace with single space
      .replace(/\s+/g, " ")
      // Trim
      .trim();

    // Use JSON.stringify to properly escape any remaining problematic characters
    try {
      const jsonSafe = JSON.stringify(sanitized);
      // Remove the quotes added by JSON.stringify
      sanitized = jsonSafe.slice(1, -1);
    } catch {
      // If JSON.stringify fails, be very aggressive - keep only safe ASCII + basic Latin
      sanitized = sanitized
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Truncate if too long
    return sanitized.substring(0, maxLength);
  }

  public static sanitizeJsonData(data: unknown, maxLength = 1000): unknown {
    if (typeof data === "string") {
      return TextSanitizer.sanitize(data, maxLength);
    }
    if (Array.isArray(data)) {
      return data.map((item) => TextSanitizer.sanitizeJsonData(item, maxLength));
    }
    if (data && typeof data === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = TextSanitizer.sanitizeJsonData(value, maxLength);
      }
      return result;
    }
    return data;
  }
}

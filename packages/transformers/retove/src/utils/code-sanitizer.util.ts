/**
 * Code-safe text sanitizer for repository files.
 * Preserves newlines, tabs, and backslashes critical for code fidelity.
 * Only removes true control characters and problematic Unicode.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: We want to keep this class static
export class CodeSanitizer {
  /**
   * Minimal sanitization for code content storage.
   * Preserves all whitespace and backslashes.
   */
  public static sanitize(text: string | null | undefined): string {
    if (!text) return "";

    return (
      text
        // Remove only true control characters (NOT \n, \t, \r)
        // \x00-\x08: NULL through BACKSPACE
        // \x0B: Vertical Tab
        // \x0C: Form Feed
        // \x0E-\x1F: Shift Out through Unit Separator
        // \x7F-\x9F: DEL through Application Program Command
        // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional removal of control chars
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
        // Remove problematic Unicode replacement characters
        .replace(/[\uFFFD\uFFFE\uFFFF]/g, "")
    );
  }

  public static sanitizeForEmbedding(text: string | null | undefined): string {
    if (!text) return "";

    return (
      CodeSanitizer.sanitize(text)
        // Collapse excessive consecutive newlines (max 3)
        .replace(/\n{4,}/g, "\n\n\n")
        // Collapse very long runs of spaces/tabs (max 8)
        .replace(/[ \t]{9,}/g, "        ")
        // Trim trailing whitespace per line to reduce noise
        .replace(/[ \t]+$/gm, "")
    );
  }

  public static formatChunkTitle(
    repositoryFullName: string,
    path: string,
    startLine?: number,
    endLine?: number,
  ): string {
    const base = `${repositoryFullName}:${path}`;
    if (startLine !== undefined && endLine !== undefined) {
      return `${base}#L${startLine}-L${endLine}`;
    }
    return base;
  }
}

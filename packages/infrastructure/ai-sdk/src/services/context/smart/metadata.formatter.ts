import { getLogger } from "@ait/core";

const logger = getLogger();

const BLACKLISTED_FIELDS = new Set([
  "id",
  "__type",
  "__source",
  "__collection",
  "__indexed_at",
  "baseUrl",
  "productUrl",
  "url",
  "localPath",
  "filename",
  "mimeType",
]);

export class MetadataFormatter {
  public format(metadata: Record<string, unknown>, indent = 2): string {
    try {
      const lines: string[] = [];
      this._formatRecursive(metadata, lines, 0, indent);
      return lines.join("\n");
    } catch (error) {
      logger.warn("Failed to format metadata", { error });
      return "";
    }
  }

  private _formatRecursive(
    obj: Record<string, unknown>,
    lines: string[],
    currentIndent: number,
    baseIndent: number,
  ): void {
    const spacing = " ".repeat(currentIndent);

    for (const [key, value] of Object.entries(obj)) {
      if (BLACKLISTED_FIELDS.has(key)) continue;
      if (value === null || value === undefined) continue;

      if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        const nestedObj = value as Record<string, unknown>;
        if (Object.keys(nestedObj).length === 0) continue;

        lines.push(`${spacing}- ${this._humanizeKey(key)}:`);
        this._formatRecursive(nestedObj, lines, currentIndent + baseIndent, baseIndent);
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        lines.push(`${spacing}- ${this._humanizeKey(key)}: ${value.join(", ")}`);
        continue;
      }

      const formattedValue = this._formatValue(value);
      if (formattedValue) {
        lines.push(`${spacing}- ${this._humanizeKey(key)}: ${formattedValue}`);
      }
    }
  }

  private _humanizeKey(key: string): string {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  private _formatValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "string") {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return value;
      }
      return value;
    }

    return String(value);
  }
}

let _instance: MetadataFormatter | null = null;

export function getMetadataFormatter(): MetadataFormatter {
  if (!_instance) {
    _instance = new MetadataFormatter();
  }
  return _instance;
}

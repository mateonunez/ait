export function escapeXmlAttribute(value: unknown): string {
  return String(value).replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });
}

export function escapeXmlText(value: unknown): string {
  return String(value).replace(/[<&]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case "&":
        return "&amp;";
      default:
        return c;
    }
  });
}

export function escapeXml(value: unknown): string {
  return escapeXmlAttribute(value); // Helper to safely stringify and truncate complex objects/arrays
}

function smartStringify(value: unknown, maxLength = 20000): string {
  try {
    const json = JSON.stringify(value);
    if (json.length <= maxLength) return json;

    if (Array.isArray(value)) {
      // If array is too big, don't just show 5. Show as many as fit.
      // Estimate item size from first 5 items
      const sample = value.slice(0, 5);
      const sampleJson = JSON.stringify(sample);
      const avgItemSize = sampleJson.length / 5;

      // Calculate safe count (reserving 100 chars for suffix)
      const safeCount = Math.max(5, Math.floor((maxLength - 100) / avgItemSize));

      if (value.length > safeCount) {
        const preview = value.slice(0, safeCount);
        return `${JSON.stringify(preview).slice(0, -1)}, "... + ${value.length - safeCount} more items"]`;
      }
    }

    if (typeof value === "object" && value !== null) {
      // If object is too big, summary
      return `{... ${Object.keys(value).length} fields ...}`;
    }

    return `${String(value).slice(0, maxLength)}...`;
  } catch (e) {
    return String(value);
  }
}

export function formatMetadataToXml(
  metadata: Record<string, unknown>,
  excludedKeys: string[] = ["id", "originalText"],
): string {
  return Object.entries(metadata)
    .filter(([key]) => !key.startsWith("__") && !excludedKeys.includes(key))
    .map(([key, value]) => {
      let stringValue = value;

      if (typeof value === "object" && value !== null) {
        stringValue = smartStringify(value);
      }

      // Use Text escaping for content (preserves quotes for readable JSON)
      const safeValue = escapeXmlText(stringValue);
      return `<${key}>${safeValue}</${key}>`;
    })
    .join("");
}

export function formatDocumentToXml(
  id: string,
  type: string,
  metadataXml: string,
  content: string,
  title?: string,
): string {
  // Use Text escaping for title (preserves quotes)
  const titleElement = title ? `  <title>${escapeXmlText(title)}</title>\n` : "";
  return [
    `<document id="${id}" type="${type}">`,
    titleElement,
    `  <metadata>${metadataXml}</metadata>`,
    "  <content>",
    content
      .split("\n")
      .map((line) => `    ${line}`) // Content is already raw text, usually safe, but debatable. Assuming pre-sanitized or raw.
      .join("\n"),
    "  </content>",
    "</document>",
  ]
    .filter(Boolean)
    .join("\n");
}

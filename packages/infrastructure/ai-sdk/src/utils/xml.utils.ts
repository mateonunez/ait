export function escapeXml(value: unknown): string {
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

export function formatMetadataToXml(
  metadata: Record<string, unknown>,
  excludedKeys: string[] = ["id", "originalText"],
): string {
  return Object.entries(metadata)
    .filter(([key]) => !key.startsWith("__") && !excludedKeys.includes(key))
    .map(([key, value]) => {
      const safeValue = escapeXml(value);
      return `<${key}>${safeValue}</${key}>`;
    })
    .join("");
}

export function formatDocumentToXml(id: string, type: string, metadataXml: string, content: string): string {
  return [
    `<document id="${id}" type="${type}">`,
    `  <metadata>${metadataXml}</metadata>`,
    "  <content>",
    content
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n"),
    "  </content>",
    "</document>",
  ].join("\n");
}

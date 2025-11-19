/**
 * Escapes special characters for XML content.
 * @param value - The string to escape.
 * @returns The escaped string safe for XML.
 */
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

/**
 * Formats a metadata object into XML tags.
 * Filters out keys starting with "__" or matching excluded keys.
 * @param metadata - The metadata object to format.
 * @param excludedKeys - Array of keys to exclude from the output.
 * @returns A string of XML tags representing the metadata.
 */
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

/**
 * Formats a document into an XML string with metadata and content.
 * @param id - The document ID.
 * @param type - The document type.
 * @param metadataXml - The pre-formatted metadata XML string.
 * @param content - The document content.
 * @returns The formatted XML string for the document.
 */
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

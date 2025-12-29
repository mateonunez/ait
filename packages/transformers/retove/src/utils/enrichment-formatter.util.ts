import type { EnrichmentResult } from "../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function formatEnrichmentForText(enrichment: EnrichmentResult | null | undefined): string {
  if (!enrichment) return "";

  const parts: string[] = [];

  // Text-based enrichments
  if (enrichment.summary) parts.push(`Summary: ${stringifyValue(enrichment.summary)}`);
  if (enrichment.sentiment) parts.push(`Sentiment: ${stringifyValue(enrichment.sentiment)}`);
  if (enrichment.entities?.length) parts.push(`Entities: ${enrichment.entities.join(", ")}`);
  if (enrichment.intent) parts.push(`Intent: ${stringifyValue(enrichment.intent)}`);
  if (enrichment.technicalDetails) parts.push(`Technical Details: ${stringifyValue(enrichment.technicalDetails)}`);
  if (enrichment.mood) parts.push(`Mood: ${stringifyValue(enrichment.mood)}`);

  // Image/vision-specific enrichments
  if (enrichment.ocr) parts.push(`OCR: ${stringifyValue(enrichment.ocr)}`);
  if (enrichment.objects?.length) parts.push(`Objects: ${enrichment.objects.join(", ")}`);
  if (enrichment.style) parts.push(`Style: ${stringifyValue(enrichment.style)}`);

  return parts.length > 0 ? `\n\n--- AI Enrichment ---\n${parts.join("\n")}` : "";
}

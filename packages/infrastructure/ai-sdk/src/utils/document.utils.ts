import type { BaseMetadata } from "../types/documents";

export function getMetadataString(metadata: BaseMetadata, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === "string" ? value : undefined;
}

export function getMetadataArray<T = unknown>(metadata: BaseMetadata, key: string): T[] | undefined {
  const value = metadata[key];
  return Array.isArray(value) ? value : undefined;
}

export function getMetadataNumber(metadata: BaseMetadata, key: string): number | undefined {
  const value = metadata[key];
  return typeof value === "number" ? value : undefined;
}

export function getMetadataBoolean(metadata: BaseMetadata, key: string): boolean | undefined {
  const value = metadata[key];
  return typeof value === "boolean" ? value : undefined;
}

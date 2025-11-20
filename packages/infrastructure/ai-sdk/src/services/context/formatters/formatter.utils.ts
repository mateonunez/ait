import type { BaseMetadata } from "../../../types/documents";

export interface EntityFormatter<T = BaseMetadata> {
  format(meta: T, pageContent?: string): string;
}

export const safeString = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

export const safeNumber = (value: unknown): number | null => (typeof value === "number" ? value : null);

export const safeArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

export const joinParts = (...parts: (string | null | undefined)[]): string =>
  parts.filter((p): p is string => Boolean(p)).join("");

export const extractArtistName = (artists: unknown[]): string => {
  if (artists.length === 0) return "Unknown Artist";
  const first = artists[0];
  if (typeof first === "string") return first;
  if (typeof first === "object" && first !== null && "name" in first && typeof first.name === "string") {
    return first.name;
  }
  return "Unknown Artist";
};

export const formatDate = (date: unknown): string | null => {
  if (!date) return null;
  try {
    return new Date(date as string | number | Date).toLocaleDateString();
  } catch {
    return null;
  }
};

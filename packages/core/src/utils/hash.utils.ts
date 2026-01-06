import { createHash } from "node:crypto";

/**
 * Compute hash of content using specified algorithm (default: md5).
 */
export function computeHash(content: string, algorithm = "md5"): string {
  return createHash(algorithm).update(content).digest("hex");
}

/**
 * Creates a content hash/fingerprint.
 * Uses first N characters to balance uniqueness vs performance and creates an MD5 hash.
 * Default length is 500 characters.
 */
export function createContentHash(content: string, length = 500): string {
  const normalizedContent = content.slice(0, length).toLowerCase().trim();
  return createHash("md5").update(normalizedContent).digest("hex");
}

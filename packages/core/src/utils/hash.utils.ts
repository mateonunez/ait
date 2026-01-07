import CryptoJS from "crypto-js";

/**
 * Compute hash of content using specified algorithm (default: md5).
 */
export function computeHash(content: string, algorithm = "md5"): string {
  if (algorithm.toLowerCase() === "md5") {
    return CryptoJS.MD5(content).toString(CryptoJS.enc.Hex);
  }
  if (algorithm.toLowerCase() === "sha256") {
    return CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex);
  }
  // Fallback or throw if algorithm not supported by CryptoJS as easily
  throw new Error(`Algorithm ${algorithm} not supported in browser-compatible hash utils`);
}

/**
 * Creates a content hash/fingerprint.
 * Uses first N characters to balance uniqueness vs performance and creates an MD5 hash.
 * Default length is 500 characters.
 */
export function createContentHash(content: string, length = 500): string {
  const normalizedContent = content.slice(0, length).toLowerCase().trim();
  return CryptoJS.MD5(normalizedContent).toString(CryptoJS.enc.Hex);
}

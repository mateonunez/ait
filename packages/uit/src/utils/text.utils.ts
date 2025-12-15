export const DEFAULT_MAX_CHARS = 300;

export function truncateText(text: string | null | undefined, maxLength = DEFAULT_MAX_CHARS): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

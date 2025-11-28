export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Never";

  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const isFuture = diffMs < 0;
  const seconds = Math.floor(Math.abs(diffMs) / 1000);

  if (seconds < 60) return isFuture ? "in a moment" : "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return isFuture ? `in ${minutes}m` : `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isFuture ? `in ${hours}h` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return isFuture ? `in ${days}d` : `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return isFuture ? `in ${months}mo` : `${months}mo ago`;

  const years = Math.floor(months / 12);
  return isFuture ? `in ${years}y` : `${years}y ago`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";

  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }

  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }

  return num.toString();
}

import type { QueryPlanResult } from "../../types/rag";

const TAG_KEYWORDS: Record<string, string[]> = {
  code: ["code", "git", "repository", "commit", "branch", "merge", "pr", "pull request", "issue", "debug", "bug"],
  tasks: ["task", "tasks", "workflow", "project", "ticket", "kanban", "backlog", "todo"],
  music: [
    "music",
    "song",
    "track",
    "album",
    "playlist",
    "artist",
    "melody",
    "rhythm",
    "composition",
    "audio",
    "listening",
    "playing",
  ],
  notes: ["note", "notes", "meeting", "summary", "documentation"],
  playlist: ["playlist", "spotify", "mix", "queue"],
  tweets: ["tweet", "twitter", "x", "microblog", "posted"],
};

export interface IQueryHeuristicService {
  buildFallbackPlan(userQuery: string, limit: number): QueryPlanResult;
  inferTags(userQuery: string): string[] | undefined;
}

export class QueryHeuristicService implements IQueryHeuristicService {
  buildFallbackPlan(userQuery: string, limit: number): QueryPlanResult {
    const trimmed = userQuery?.trim();
    const queries = trimmed ? [trimmed].slice(0, Math.max(limit, 1)) : [];
    const inferredTags = this.inferTags(userQuery);

    return {
      queries,
      tags: inferredTags,
      source: "heuristic",
      isDiverse: false,
      usedFallback: true,
      originalQuery: trimmed && trimmed.length > 0 ? trimmed : userQuery,
    };
  }

  inferTags(userQuery: string): string[] | undefined {
    const normalized = this._normalize(userQuery);
    if (!normalized) return undefined;

    const tags = new Set<string>();
    for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
      if (keywords.some((keyword) => normalized.includes(keyword))) {
        tags.add(tag);
      }
    }

    return tags.size > 0 ? Array.from(tags) : undefined;
  }

  private _normalize(query: string): string {
    return query?.trim().toLowerCase() ?? "";
  }
}

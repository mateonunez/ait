import type { TypeFilter } from "../../types/rag";

/**
 * Interface for type filter service
 */
export interface ITypeFilterService {
  /**
   * Detect domain-specific type filter from user query
   * @param userQuery - The user's search query
   * @returns Type filter or undefined for generic queries
   */
  detectTypeFilter(userQuery: string): TypeFilter | undefined;
}

export class TypeFilterService implements ITypeFilterService {
  private readonly _githubPattern = /\b(github|repository|repositories|repo|repos|project|projects|code|codebase)\b/i;
  private readonly _linearPattern = /\b(linear|issue|issues|task|tasks|ticket|tickets)\b/i;
  private readonly _spotifyPattern =
    /\b(spotify|music|song|songs|track|tracks|playlist|playlists|artist|artists|album|albums|listening)\b/i;
  private readonly _twitterPattern = /\b(twitter|tweet|tweets|x\.com)\b/i;

  detectTypeFilter(userQuery: string): TypeFilter | undefined {
    const prompt = userQuery.toLowerCase();

    // GitHub-related queries (exclude if Spotify is also mentioned to avoid confusion)
    if (this._githubPattern.test(prompt) && !this._spotifyPattern.test(prompt)) {
      return { types: ["repository"] };
    }

    // Linear-related queries
    if (this._linearPattern.test(prompt)) {
      return { types: ["issue"] };
    }

    // Spotify-related queries
    if (this._spotifyPattern.test(prompt)) {
      return { types: ["track", "artist", "playlist", "album", "recently_played"] };
    }

    // Twitter/X-related queries
    if (this._twitterPattern.test(prompt)) {
      return { types: ["tweet"] };
    }

    // No filter - return undefined for generic queries
    return undefined;
  }
}

import { fetchSuggestions } from "@/utils/api/suggestions.api";
import type { Suggestion } from "@ait/ai-sdk";
import { getLogger } from "@ait/core";
import { useEffect, useState } from "react";

const logger = getLogger();

export interface UseAiSuggestionsOptions {
  enabled?: boolean;
  context?: string;
  history?: string;
}

export function useAiSuggestions(options: UseAiSuggestionsOptions = {}) {
  const { enabled = true, context, history } = options;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const fetchSuggestionsCallback = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchSuggestions({
          context,
          history,
        });
        if (mounted) {
          setSuggestions(result);
        }
      } catch (err) {
        if (mounted) {
          logger.error("Failed to fetch suggestions:", { error: err });
          setError("Failed to load suggestions");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSuggestionsCallback();

    return () => {
      mounted = false;
    };
  }, [enabled, context, history]);

  return { suggestions, isLoading, error };
}

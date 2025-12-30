import { fetchSuggestions } from "@/services/suggestions.service";
import type { Suggestion } from "@ait/ai-sdk";
import { getLogger } from "@ait/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const logger = getLogger();

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface UseAiSuggestionsOptions {
  enabled?: boolean;
  context?: string;
  /** Last 3-4 messages for contextual suggestions */
  recentMessages?: ChatMessage[];
  debounceMs?: number;
}

export interface UseAiSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAiSuggestions(options: UseAiSuggestionsOptions = {}): UseAiSuggestionsReturn {
  const { enabled = true, context, recentMessages, debounceMs = 300 } = options;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Memoize the last 4 messages to avoid unnecessary re-renders
  // We stringify the dependency to ensure stable mapping even if parent passes new array instances
  const last4Messages = useMemo(() => {
    return recentMessages?.slice(-4);
  }, [recentMessages]);

  const fetchSuggestionsInternal = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchSuggestions({
        context,
        recentMessages: last4Messages,
      });
      if (mountedRef.current) {
        setSuggestions(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        logger.error("Failed to fetch suggestions:", { error: err });
        setError("Failed to load suggestions");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, context, last4Messages]);

  const refresh = useCallback(() => {
    fetchSuggestionsInternal();
  }, [fetchSuggestionsInternal]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      setSuggestions([]);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fetchSuggestionsInternal();
    }, debounceMs);

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, debounceMs, fetchSuggestionsInternal]);

  return { suggestions, isLoading, error, refresh };
}

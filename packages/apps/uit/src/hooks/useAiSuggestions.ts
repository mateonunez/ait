import { fetchSuggestions } from "@/services/suggestions.service";
import type { Suggestion } from "@ait/ai-sdk";
import { getLogger } from "@ait/core";
import { useCallback, useEffect, useRef, useState } from "react";

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

  // Use a stable key for messages to prevent unnecessary re-fetches
  // We compare stringified content rather than array references
  const messagesKey = JSON.stringify(recentMessages?.slice(-4));
  const prevMessagesKeyRef = useRef(messagesKey);
  const last4MessagesRef = useRef(recentMessages?.slice(-4));

  // Only update the stored messages when content actually changes
  if (messagesKey !== prevMessagesKeyRef.current) {
    prevMessagesKeyRef.current = messagesKey;
    last4MessagesRef.current = recentMessages?.slice(-4);
  }

  const fetchSuggestionsInternal = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchSuggestions({
        context,
        recentMessages: last4MessagesRef.current,
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
  }, [enabled, context]);

  const refresh = useCallback(() => {
    fetchSuggestionsInternal();
  }, [fetchSuggestionsInternal]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: it's ok
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debounceMs, fetchSuggestionsInternal, messagesKey]);

  return { suggestions, isLoading, error, refresh };
}

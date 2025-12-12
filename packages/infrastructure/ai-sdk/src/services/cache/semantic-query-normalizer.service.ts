import { getLogger } from "@ait/core";
import { generateText } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { GenerationModels } from "./../../config/models.config";

const logger = getLogger();

const DEFAULT_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
// Use a fast, lightweight model for normalization - much faster than full generation model
const DEFAULT_NORMALIZER_MODEL = process.env.SEMANTIC_NORMALIZER_MODEL || GenerationModels.GPT_OSS_20B_CLOUD;

export interface CanonicalQueryIntent {
  entity: string;
  collection: string;
  action?: string;
  filters?: Record<string, string>;
}

const NORMALIZATION_PROMPT = `You are a query intent extractor. Given a user query, extract its core semantic intent.

RULES:
1. Extract the PRIMARY entity type (what the user wants: artist, repository, track, message, page, etc.)
2. Identify the TARGET collection/service (spotify, github, notion, slack, etc.)
3. Identify the ACTION if clear (list, create, search, get)
4. Ignore qualifier words like "favorite", "recent", "top", "best", "my" - focus on CORE intent
5. Two queries with the same semantic meaning should produce IDENTICAL output

RESPOND ONLY with a JSON object in this exact format:
{"entity":"<entity>","collection":"<collection>","action":"<action>"}

Examples:
- "Show me my favorite artists on Spotify" → {"entity":"artist","collection":"spotify","action":"list"}
- "List my Spotify artists" → {"entity":"artist","collection":"spotify","action":"list"}
- "Please, list my Spotify artists" → {"entity":"artist","collection":"spotify","action":"list"}
- "What are my top GitHub repositories?" → {"entity":"repository","collection":"github","action":"list"}
- "List my GitHub repos" → {"entity":"repository","collection":"github","action":"list"}
- "Show recent Slack messages" → {"entity":"message","collection":"slack","action":"list"}
- "Get my Notion pages" → {"entity":"page","collection":"notion","action":"list"}

User Query: `;

export class SemanticQueryNormalizer {
  private readonly _ollamaProvider;
  private readonly _model;
  private readonly _cache = new Map<string, string>();
  private readonly _modelName: string;

  constructor(modelName?: string) {
    const rawBaseURL = DEFAULT_OLLAMA_BASE_URL;
    const apiBaseURL = rawBaseURL.endsWith("/api") ? rawBaseURL : `${rawBaseURL}/api`;
    this._ollamaProvider = createOllama({ baseURL: apiBaseURL });

    this._modelName = modelName || DEFAULT_NORMALIZER_MODEL;
    this._model = this._ollamaProvider(this._modelName);

    logger.info("SemanticQueryNormalizer initialized", { model: this._modelName });
  }

  async normalize(query: string, collection?: string): Promise<string> {
    const cacheKey = `${query}:${collection || ""}`;
    const cached = this._cache.get(cacheKey);
    if (cached) {
      logger.debug("Semantic normalizer cache hit", { query: query.slice(0, 50) });
      return cached;
    }

    try {
      const startTime = Date.now();
      const { text } = await generateText({
        model: this._model,
        prompt: NORMALIZATION_PROMPT + query,
        temperature: 0, // Deterministic output for caching
      });

      const intent = this._parseIntent(text, collection);
      const canonicalKey = this._buildCanonicalKey(intent);

      const duration = Date.now() - startTime;
      logger.debug("Query normalized via LLM", {
        original: query.slice(0, 50),
        canonical: canonicalKey,
        duration,
      });

      // Cache the result
      this._cache.set(cacheKey, canonicalKey);

      return canonicalKey;
    } catch (error) {
      logger.warn("LLM normalization failed, falling back to simple normalization", { error });
      return this._fallbackNormalize(query, collection);
    }
  }

  private _parseIntent(text: string, overrideCollection?: string): CanonicalQueryIntent {
    try {
      // Extract JSON from response
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");

      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("No JSON found in response");
      }

      const jsonStr = text.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr);

      return {
        entity: String(parsed.entity || "unknown").toLowerCase(),
        collection: overrideCollection || String(parsed.collection || "unknown").toLowerCase(),
        action: parsed.action ? String(parsed.action).toLowerCase() : undefined,
      };
    } catch {
      return {
        entity: "unknown",
        collection: overrideCollection || "unknown",
        action: "list",
      };
    }
  }

  private _buildCanonicalKey(intent: CanonicalQueryIntent): string {
    const parts = [intent.entity, intent.collection];
    if (intent.action) {
      parts.push(intent.action);
    }
    return parts.sort().join(":");
  }

  private _fallbackNormalize(query: string, collection?: string): string {
    // Simple fallback: lowercase, remove punctuation, sort words
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .sort();

    if (collection) {
      words.push(collection.toLowerCase());
    }

    return [...new Set(words)].sort().join(":");
  }
}

// Singleton instance
let _normalizerInstance: SemanticQueryNormalizer | null = null;

export function getSemanticQueryNormalizer(): SemanticQueryNormalizer {
  if (!_normalizerInstance) {
    _normalizerInstance = new SemanticQueryNormalizer();
  }
  return _normalizerInstance;
}

export function resetSemanticQueryNormalizer(): void {
  _normalizerInstance = null;
}

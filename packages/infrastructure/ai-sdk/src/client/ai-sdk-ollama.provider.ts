import { createOllama } from "ollama-ai-provider-v2";
import { DEFAULT_OLLAMA_BASE_URL } from "./ai-sdk.client";

let _ollamaProvider: ReturnType<typeof createOllama> | null = null;

export function getOllamaProvider() {
  if (!_ollamaProvider) {
    const baseURL = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
    const apiURL = baseURL.endsWith("/api") ? baseURL : `${baseURL}/api`;

    _ollamaProvider = createOllama({
      baseURL: apiURL,
    });
  }
  return _ollamaProvider;
}

export function resetOllamaProvider() {
  _ollamaProvider = null;
}

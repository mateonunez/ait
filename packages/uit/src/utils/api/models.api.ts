import type { ModelMetadata } from "../../types/streaming.types";
import { apiGet, apiPost } from "../http-client";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3000";

export async function listModels(): Promise<ModelMetadata[]> {
  const res = await apiGet<ModelMetadata[] | { models: ModelMetadata[] }>(`${GATEWAY_URL}/api/models`);

  if (!res.ok) {
    console.error("[ModelsAPI] Error listing models:", res.error);
    return [];
  }

  const data = res.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (data && "models" in data && Array.isArray(data.models)) {
    return data.models;
  }

  console.warn("[ModelsAPI] Unexpected response format:", data);
  return [];
}

export async function getModel(modelId: string): Promise<ModelMetadata | null> {
  const res = await apiGet<ModelMetadata>(`${GATEWAY_URL}/api/models/${encodeURIComponent(modelId)}`);

  if (!res.ok) {
    if (res.error?.includes("HTTP_404")) {
      return null;
    }
    console.error(`[ModelsAPI] Error getting model ${modelId}:`, res.error);
    return null;
  }

  return res.data ?? null;
}

export async function registerModel(model: ModelMetadata): Promise<boolean> {
  const res = await apiPost<void>(`${GATEWAY_URL}/api/models/register`, model);

  if (!res.ok) {
    console.error("[ModelsAPI] Error registering model:", res.error);
    return false;
  }

  return true;
}

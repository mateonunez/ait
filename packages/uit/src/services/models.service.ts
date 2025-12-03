import type { ModelMetadata } from "@ait/core";
import { getLogger } from "@ait/core";
import { apiConfig } from "../config/api.config";
import { apiGet, apiPost } from "../utils/http-client";

const logger = getLogger();

export async function listModels(): Promise<ModelMetadata[]> {
  const res = await apiGet<ModelMetadata[] | { models: ModelMetadata[] }>(`${apiConfig.gatewayUrl}/api/models`);

  if (!res.ok) {
    logger.error("[ModelsService] Error listing models:", { error: res.error });
    return [];
  }

  const data = res.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (data && "models" in data && Array.isArray(data.models)) {
    return data.models;
  }

  logger.warn("[ModelsService] Unexpected response format:", data);
  return [];
}

export async function getModel(modelId: string): Promise<ModelMetadata | null> {
  const res = await apiGet<ModelMetadata>(`${apiConfig.gatewayUrl}/api/models/${encodeURIComponent(modelId)}`);

  if (!res.ok) {
    if (res.error?.includes("HTTP_404")) {
      return null;
    }
    logger.error(`[ModelsService] Error getting model ${modelId}:`, { error: res.error });
    return null;
  }

  return res.data ?? null;
}

export async function registerModel(model: ModelMetadata): Promise<boolean> {
  const res = await apiPost<void>(`${apiConfig.gatewayUrl}/api/models/register`, model);

  if (!res.ok) {
    logger.error("[ModelsService] Error registering model:", { error: res.error });
    return false;
  }

  return true;
}

export interface QdrantPayload {
  id?: string;
  __type?: string;
  text?: string;
  pageContent?: string;
  [key: string]: unknown;
}

export interface QdrantPoint {
  id: string | number;
  version: number;
  score: number;
  payload?: QdrantPayload;
  vector?: number[] | Record<string, number[]>;
}

export interface QdrantSearchResult {
  points: QdrantPoint[];
  time: number;
}

export function extractContentFromPayload(payload?: QdrantPayload | Record<string, unknown>): string {
  if (!payload) return "";
  const text = typeof payload.text === "string" ? payload.text : undefined;
  const pageContent = typeof payload.pageContent === "string" ? payload.pageContent : undefined;
  return text || pageContent || "";
}

export function extractMetadataFromPayload(payload?: QdrantPayload | Record<string, unknown>): {
  id: string;
  __type: string;
  [key: string]: unknown;
} {
  if (!payload) {
    return {
      id: "unknown",
      __type: "Unknown",
    };
  }

  const id = typeof payload.id === "string" ? payload.id : "unknown";
  const __type = typeof payload.__type === "string" ? payload.__type : "Unknown";

  const { text, pageContent, ...rest } = payload;

  return {
    id,
    __type,
    ...rest,
  };
}

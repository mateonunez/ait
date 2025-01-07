export interface IETLEmbeddingDescriptor<T> {
  getEmbeddingText(entity: T): string;
  getEmbeddingPayload<U extends Record<string, unknown>>(entity: T): U;
}

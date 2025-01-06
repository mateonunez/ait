export interface IEmbeddingsService {
  generateEmbeddings(text: string): Promise<number[]>;
}
